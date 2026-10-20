using System.Collections;
using System.Reflection;
using System.Text.Json;
using System.Linq.Expressions;
namespace Companion.Bridge;
public record Placement(string Id,string ItemId,string? Recipe,int X,int Y,int[]? SourceTile);
public record LayoutRequest(int Version,string RequestId,string SaveId,string FarmerId,string FarmType,long RequestedAt,int SessionId,Placement[] Items);
public static class FarmTransfer
{
    static string handled="";
    static DateTime lastRequestStamp;
    static object? Invoke(object target,string name,params object?[] args)
    {
        var type=target as Type??target.GetType();var flags=BindingFlags.Public|(target is Type?BindingFlags.Static:BindingFlags.Instance);
        var method=type.GetMethods(flags).First(m=>m.Name==name&&!m.IsGenericMethod&&m.GetParameters().Length>=args.Length&&m.GetParameters().Skip(args.Length).All(p=>p.IsOptional)&&m.GetParameters().Take(args.Length).Select((p,i)=>args[i]==null||p.ParameterType.IsInstanceOfType(args[i])).All(v=>v));
        return method.Invoke(target is Type?null:target,args.Concat(method.GetParameters().Skip(args.Length).Select(p=>p.DefaultValue)).ToArray());
    }
    static IEnumerable<(object Key,object Value)> Pairs(object dictionary) => Runtime.Elements(dictionary).Cast<object>().Select(e=>(Runtime.Read(e,"Key")!,Runtime.Read(e,"Value")!));
    static int Count(object item)=>Convert.ToInt32(Runtime.Read(item,"Stack"));
    static void Stack(object item,int value)=>item.GetType().GetProperty("Stack")!.SetValue(item,value);
    public static void Process(Assembly game,Type game1,string root,string saveId,string farmerId,object farmer)
    {
        var path=Path.Combine(root,"layout-request.json");if(!File.Exists(path)||new FileInfo(path).Length>1048576)return;
        var stamp=File.GetLastWriteTimeUtc(path);if(stamp==lastRequestStamp)return;lastRequestStamp=stamp;
        var request=JsonSerializer.Deserialize<LayoutRequest>(File.ReadAllText(path),Protocol.Json);
        if(request==null||request.RequestId==handled)return;
        var previousPath=Path.Combine(root,"layout-result.json");
        if(File.Exists(previousPath)&&new FileInfo(previousPath).Length<1048576&&JsonDocument.Parse(File.ReadAllText(previousPath)).RootElement.GetProperty("requestId").GetString()==request.RequestId){handled=request.RequestId;return;}
        if(request.SaveId!=saveId||request.FarmerId!=farmerId)return;
        handled=request.RequestId;var applied=new List<string>();
        try
        {
            if(request.Version!=1||request.SessionId!=Environment.ProcessId||request.Items.Length>500||DateTimeOffset.UtcNow.ToUnixTimeSeconds()-request.RequestedAt is <0 or >60)throw new InvalidDataException("Layout request expired or exceeds limits. Send it again while standing on the farm.");
            if(!Equals(Runtime.Read(game1,"IsMasterGame"),true)||Equals(Runtime.Read(game1,"IsMultiplayer"),true))throw new InvalidOperationException("Layout transfer currently supports the single-player host only.");
            var location=Runtime.Read(game1,"currentLocation")!;
            if(location.GetType().FullName!="StardewValley.Farm"||Runtime.Read(game1,"activeClickableMenu")!=null||Equals(Runtime.Read(game1,"eventUp"),true))throw new InvalidOperationException("Stand on the farm and close menus before sending a layout.");
            var farmName=(int)Runtime.Read(game1,"whichFarm")! switch{0=>"Standard",1=>"Riverland",2=>"Forest",3=>"Hill-top",4=>"Wilderness",5=>"Four Corners",6=>"Beach",7=>Convert.ToString(Runtime.Read(Runtime.Read(game1,"whichModFarm"),"Id"))=="MeadowlandsFarm"?"Meadowlands":"Custom",_=>"Custom"};
            if(request.FarmType!=farmName)throw new InvalidOperationException("The layout belongs to another farm type.");
            var objects=Runtime.Read(location,"objects")!;
            var vectorType=objects.GetType().GetMethods().First(m=>m.Name=="ContainsKey").GetParameters()[0].ParameterType;
            object Vector(int x,int y)=>Activator.CreateInstance(vectorType,(float)x,(float)y)!;
            var inventory=((IEnumerable)Runtime.Read(farmer,"Items")!).Cast<object?>().ToArray();
            var reserved=new int[inventory.Length];var prepared=new List<(Placement Placement,object Item,object? Recipe,int Slot,object Target,object? Origin)>();
            var targets=new HashSet<string>();var origins=new HashSet<string>();var identities=new HashSet<string>();
            foreach(var p in request.Items)
            {
                if(string.IsNullOrEmpty(p.Id)||!identities.Add(p.Id))throw new InvalidDataException("Duplicate or missing placement identity.");
                if(p.SourceTile!=null&&(p.SourceTile.Length!=2||p.SourceTile.Any(v=>v<0||v>255)))throw new InvalidDataException("Invalid original object position.");
                if(p.SourceTile!=null&&!origins.Add(string.Join(",",p.SourceTile)))throw new InvalidDataException("An existing object can only be moved once per transfer.");
                if(new[]{"(O)286","(O)287","(O)288"}.Contains(p.ItemId))throw new InvalidOperationException("Explosive items are not supported by farm design transfer.");
                if(p.X is <0 or >255||p.Y is <0 or >255||!targets.Add($"{p.X},{p.Y}")||p.ItemId.Length>160)throw new InvalidDataException("Invalid or overlapping placement.");
                var target=Vector(p.X,p.Y);
                if(p.SourceTile is {Length:2}&&p.SourceTile[0]==p.X&&p.SourceTile[1]==p.Y)continue;
                if(Equals(Invoke(objects,"ContainsKey",target),true))throw new InvalidOperationException($"Occupied tile: {p.X}, {p.Y}. Nothing was cleared.");
                object? item=null,recipe=null,origin=null;var slot=-1;
                if(p.SourceTile is {Length:2})
                {
                    origin=Vector(p.SourceTile[0],p.SourceTile[1]);item=Pairs(objects).FirstOrDefault(e=>e.Key.Equals(origin)).Value;
                    if(item==null||Convert.ToString(Runtime.Read(item,"QualifiedItemId"))!=p.ItemId)throw new InvalidOperationException("An imported farm object moved or changed. Import the latest save again.");
                    if(!new[]{"StardewValley.Object","StardewValley.Objects.Chest","StardewValley.Objects.Cask"}.Contains(item.GetType().FullName)||Runtime.Read(item,"lightSource")!=null||Equals(Invoke(item,"IsTapper"),true))throw new InvalidOperationException("This existing object needs to be moved manually in game.");
                }
                else
                {
                    for(var i=0;i<inventory.Length;i++)if(inventory[i]!=null&&Count(inventory[i]!)>reserved[i]&&Convert.ToString(Runtime.Read(inventory[i],"QualifiedItemId"))==p.ItemId){slot=i;reserved[i]++;item=Invoke(inventory[i]!,"getOne");break;}
                    if(item==null)
                    {
                        if(string.IsNullOrEmpty(p.Recipe)||Runtime.Metric(farmer,new Condition("crafting",p.Recipe))==null||!Pairs(Runtime.Read(farmer,"craftingRecipes")!).Any(e=>Convert.ToString(e.Key)==p.Recipe))throw new InvalidOperationException("Learn the recipe or put the finished object in your inventory first.");
                        recipe=Activator.CreateInstance(game.GetType("StardewValley.CraftingRecipe",true)!,p.Recipe,false)!;
                        if(Convert.ToInt32(Runtime.Read(recipe,"numberProducedPerCraft"))!=1)throw new InvalidOperationException("For multi-output recipes, craft the items first and keep them in your inventory.");
                        item=Invoke(recipe,"createItem")!;
                        if(Convert.ToString(Runtime.Read(item,"QualifiedItemId"))!=p.ItemId)throw new InvalidOperationException("The installed recipe output does not match this design.");
                        foreach(var ingredient in Pairs(Runtime.Read(recipe,"recipeList")!))
                        {
                            var remaining=Convert.ToInt32(ingredient.Value);
                            for(var i=inventory.Length-1;i>=0&&remaining>0;i--)
                                if(inventory[i]!=null&&Equals(Invoke(recipe.GetType(),"ItemMatchesForCrafting",inventory[i],Convert.ToString(ingredient.Key)),true))
                                {var used=Math.Min(remaining,Math.Max(0,Count(inventory[i]!)-reserved[i]));reserved[i]+=used;remaining-=used;}
                            if(remaining>0)throw new InvalidOperationException("Not enough inventory ingredients for the complete supported layout. No placements were made.");
                        }
                    }
                }
                if(Convert.ToInt32(Runtime.Read(item,"Category")) is -74 or -19)throw new InvalidOperationException("Plant seeds and apply fertilizer manually. This transfer supports placed objects only.");
                if(!Equals(Invoke(item!,"isPlaceable"),true)||!Equals(Invoke(item!,"canBePlacedHere",location,target),true))throw new InvalidOperationException($"Game placement rules reject tile {p.X}, {p.Y}.");
                prepared.Add((p,item!,recipe,slot,target,origin));
            }
            // All normal placement and shared-material checks finish before the first mutation.
            foreach(var action in prepared)
            {
                if(action.Origin!=null)
                {
                    Invoke(objects,"Remove",action.Origin);
                    try{action.Item.GetType().GetProperty("TileLocation")!.SetValue(action.Item,action.Target);Invoke(objects,"Add",action.Target,action.Item);applied.Add(action.Placement.Id);}
                    catch{action.Item.GetType().GetProperty("TileLocation")!.SetValue(action.Item,action.Origin);Invoke(objects,"Add",action.Origin,action.Item);throw;}
                }
                else
                {
                    if(!Equals(Invoke(action.Item,"placementAction",location,action.Placement.X*64,action.Placement.Y*64,farmer),true))throw new InvalidOperationException("A native placement failed. Check the reported applied items before saving.");
                    applied.Add(action.Placement.Id);
                    if(action.Recipe!=null)
                    {
                        Invoke(action.Recipe,"consumeIngredients",(object?)null);
                        var counter=Runtime.Read(farmer,"craftingRecipes")!;var indexer=counter.GetType().GetProperty("Item")!;
                        var old=Convert.ToInt32(indexer.GetValue(counter,new object[]{action.Placement.Recipe!}));indexer.SetValue(counter,old+1,new object[]{action.Placement.Recipe!});
                        var questType=game.GetType("StardewValley.Quests.Quest",true)!;var q=Expression.Parameter(questType);
                        var callback=Expression.Lambda(typeof(Func<,>).MakeGenericType(questType,typeof(bool)),Expression.Call(q,questType.GetMethod("OnRecipeCrafted")!,Expression.Constant(action.Recipe,action.Recipe.GetType()),Expression.Constant(action.Item,game.GetType("StardewValley.Item",true)!),Expression.Constant(false)),q).Compile();
                        Invoke(farmer,"NotifyQuests",callback);
                        var stats=Runtime.Read(game1,"stats");if(stats!=null)Invoke(stats,"checkForCraftingAchievements");
                    }
                    else
                    {
                        var source=inventory[action.Slot]!;Stack(source,Count(source)-1);
                        if(Count(source)<=0)Runtime.Read(farmer,"Items")!.GetType().GetProperty("Item")!.SetValue(Runtime.Read(farmer,"Items"),null,new object[]{action.Slot});
                    }
                }
            }
            Protocol.Write(Path.Combine(root,"layout-result.json"),new{requestId=request.RequestId,state="applied",applied,error=(string?)null,updatedAt=DateTimeOffset.UtcNow.ToUnixTimeSeconds()});
        }
        catch(Exception error){Protocol.Write(Path.Combine(root,"layout-result.json"),new{requestId=request.RequestId,state=applied.Count==0?"rejected":"partial",applied,error=error.GetBaseException().Message,updatedAt=DateTimeOffset.UtcNow.ToUnixTimeSeconds()});}
    }
}
