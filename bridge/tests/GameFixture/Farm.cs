namespace StardewValley {
public record struct Vector(float X,float Y);
public class Item {public string QualifiedItemId{get;set;}="";public int Stack{get;set;}=1;public virtual Item getOne()=>new Object{QualifiedItemId=QualifiedItemId};}
public class Object:Item {public Vector TileLocation{get;set;}public object? lightSource;public bool IsTapper()=>false;public bool isPlaceable()=>true;public bool canBePlacedHere(Farm farm,Vector tile)=>!farm.objects.ContainsKey(tile)&&!farm.Blocked.Contains(tile);public bool placementAction(Farm farm,int x,int y,Farmer farmer){var tile=new Vector(x/64,y/64);if(!canBePlacedHere(farm,tile))return false;var item=(Object)getOne();item.TileLocation=tile;farm.objects.Add(tile,item);return true;}}
public class Farm{public Dictionary<Vector,Object> objects=new();public HashSet<Vector> Blocked=new();}
public class CraftingRecipe {public int numberProducedPerCraft=1;public Dictionary<string,int> recipeList=new(){{"388",50}};public CraftingRecipe(string name,bool cooking){}public Item createItem()=>new Object{QualifiedItemId="(BC)130"};public static bool ItemMatchesForCrafting(Item item,string key)=>item.QualifiedItemId=="(O)"+key;public void consumeIngredients(object? additional){var remaining=50;foreach(var item in Game1.player.Items){if(item.QualifiedItemId!="(O)388")continue;var used=Math.Min(remaining,item.Stack);item.Stack-=used;remaining-=used;if(remaining==0)return;}throw new Exception("Insufficient materials");}}
}
namespace StardewValley.Objects {public class Chest:StardewValley.Object {public List<StardewValley.Item> Contents=new();}}
