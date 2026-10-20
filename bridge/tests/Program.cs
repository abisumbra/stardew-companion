using Companion.Bridge;
using StardewValley;
using StardewValley.Quests;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
var directory=Path.Combine(Directory.GetCurrentDirectory(),"artifacts","bridge-test-"+Guid.NewGuid());Directory.CreateDirectory(Path.Combine(directory,"plans"));
int checks=0;void Check(bool success,string label){if(!success)throw new Exception(label);checks++;Console.WriteLine("PASS "+label);}
try{
 var questId="StardewCompanion:"+Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("123:shipping:390"))).ToLowerInvariant()[..32];
 var goal=new Goal("shipping:390",questId,"Taş gönder","Ödül yok","Taş gönder",new[]{new Condition("shipped","390")});
 var plan=new Plan(1,"42:123","123","first",new[]{goal});
 Check(Protocol.Valid(plan),"valid measurable goal accepted");
 Check(!Protocol.Valid(plan with{Goals=new[]{goal,goal}}),"duplicate quest identities rejected");
 Check(!Protocol.Complete(goal,_=>null),"unknown evidence never completes a task");
 Check(!Protocol.Complete(goal,_=>0),"owned items do not satisfy a shipping action");
 var name=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("42:123:123"))).ToLowerInvariant();
 Protocol.Write(Path.Combine(directory,"plans",name+".json"),plan);
 var story=new Quest();story.id.Value="14";Game1.player.questLog.Add(story);
 Runtime.Attach(typeof(Game1).Assembly,directory);var game=new Game1();game.Update(1);
 Check(Game1.player.questLog.Count==2,"real Harmony update hook adds only the measured goal");
 var added=Game1.player.questLog.Single(q=>q.id.Value==questId);
 Check(added._questTitle=="Companion: Taş gönder","Unicode title retained in game memory");
 Check(added.moneyReward.Value==0,"journal task grants no money");
 LocalizedContentManager.CurrentLanguageCode="en";Thread.Sleep(300);game.Update(1);
 Check(added._questTitle=="Companion: Ship Stone","journal follows the game language rather than an incompatible Companion font");
 Thread.Sleep(300);Game1.player.basicShipped["390"]=1;game.Update(1);
 Check(Game1.player.questLog.Count==1&&ReferenceEquals(Game1.player.questLog[0],story),"shipping action removes Companion task and preserves story quest");
 Check(Game1.player.QuestsCompleted==0,"no extra achievement or quest credit");
 var status=JsonDocument.Parse(File.ReadAllText(Path.Combine(directory,"status.json"))).RootElement;
 Check(status.GetProperty("completed").EnumerateArray().Any(v=>v.GetString()==goal.Id),"completion result persists while Companion is absent");
 // Current-state evidence must be withdrawn and its journal entry restored.
 Thread.Sleep(300);Game1.player.basicShipped["390"]=0;game.Update(1);
 Check(Game1.player.questLog.Any(q=>q.id.Value==questId),"a lost completion condition restores the live task");
 var reverted=JsonDocument.Parse(File.ReadAllText(Path.Combine(directory,"status.json"))).RootElement;
 Check(!reverted.GetProperty("completed").EnumerateArray().Any(v=>v.GetString()==goal.Id),"lost evidence is absent from live completion results");
 Protocol.Write(Path.Combine(directory,"plans",name+".json"),plan with{Revision="removed",Goals=Array.Empty<Goal>()});
 Thread.Sleep(300);game.Update(1);
 Check(!Game1.player.questLog.Any(q=>q.id.Value==questId),"removing a goal removes only its journal entry");
 Protocol.Write(Path.Combine(directory,"plans",name+".json"),plan with{Revision="readded"});
 Thread.Sleep(300);game.Update(1);
 Check(Game1.player.questLog.Any(q=>q.id.Value==questId),"readding an incomplete goal restores it in the same session");
 Game1.player.fishCaught["128"]=new[]{2,40};Check(Runtime.Metric(Game1.player,new Condition("fish","128"))==2,"fish uses caught count rather than fish size");
 Check(Runtime.Metric(Game1.player,new Condition("shipped","999"))==0,"missing known action counter means zero");
 var farm=new Farm();Game1.currentLocation=farm;Game1.player.craftingRecipes["Chest"]=0;
 var wood=new StardewValley.Object{QualifiedItemId="(O)388",Stack=49};Game1.player.Items.Add(wood);
 string Request(Placement placement,long? stamp=null,Placement? second=null){var request=new LayoutRequest(1,Guid.NewGuid().ToString(),"42:123","123","Standard",stamp??DateTimeOffset.UtcNow.ToUnixTimeSeconds(),Environment.ProcessId,second==null?new[]{placement}:new[]{placement,second});Protocol.Write(Path.Combine(directory,"layout-request.json"),request);FarmTransfer.Process(typeof(Game1).Assembly,typeof(Game1),directory,"42:123","123",Game1.player);return JsonDocument.Parse(File.ReadAllText(Path.Combine(directory,"layout-result.json"))).RootElement.GetProperty("state").GetString()!;}
 var placement=new Placement("chest","(BC)130","Chest",10,10,null);
 Check(Request(placement)=="rejected"&&wood.Stack==49&&farm.objects.Count==0,"material shortage rejects layout before any world or inventory mutation");
 wood.Stack=55;Check(Request(placement)=="applied"&&wood.Stack==5&&farm.objects.ContainsKey(new Vector(10,10)),"learned recipe places object and consumes exact native ingredients");
 Check(Game1.player.craftingRecipes["Chest"]==1,"actual automatic crafting updates crafting action count");
 Check(Request(placement)=="rejected"&&wood.Stack==5,"occupied destination cannot overwrite existing objects");
 var chest=new StardewValley.Objects.Chest{QualifiedItemId="(BC)130",TileLocation=new Vector(15,15)};chest.Contents.Add(new StardewValley.Object{QualifiedItemId="(O)24",Stack=3});farm.objects[new Vector(15,15)]=chest;
 Check(Request(new Placement("move","(BC)130",null,16,15,new[]{15,15}))=="applied"&&ReferenceEquals(farm.objects[new Vector(16,15)],chest)&&chest.Contents[0].Stack==3,"moving an existing chest preserves its object identity and contents");
 Check(Request(new Placement("expired","(BC)130",null,17,15,new[]{16,15}),DateTimeOffset.UtcNow.ToUnixTimeSeconds()-61)=="rejected"&&farm.objects.ContainsKey(new Vector(16,15)),"expired layout requests cannot modify the farm");
 Check(Request(new Placement("bomb","(O)288",null,18,15,null))=="rejected"&&farm.objects.Count==2,"explosives cannot be deployed by a farm design");
 Check(Request(new Placement("one","(BC)130",null,17,15,new[]{16,15}),second:new Placement("two","(BC)130",null,18,15,new[]{16,15}))=="rejected"&&farm.objects.ContainsKey(new Vector(16,15))&&farm.objects.Count==2,"the same chest cannot be duplicated through two move requests");
 Console.WriteLine($"{checks} bridge checks passed. Synthetic game fixture only; no original saves accessed.");
}finally{Directory.Delete(directory,true);}
