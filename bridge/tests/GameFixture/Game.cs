namespace StardewValley {
public class Game1 {
 public static Farmer player=new(); public static Farmer MasterPlayer=>player;
 public static ulong uniqueIDForThisGame=42; public static int gameMode=3;
 public static object currentLocation=new(); public static MoneyBox dayTimeMoneyBox=new();
 public static bool IsMasterGame=true,IsMultiplayer=false,eventUp=false;public static int whichFarm=0;public static object? whichModFarm,activeClickableMenu;
 [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)] public void Update(int elapsed){ if(elapsed<0)throw new ArgumentException(); }
}
public class MoneyBox { public bool questsDirty; }
public class Farmer { public long UniqueMultiplayerID=123; public Dictionary<string,int> basicShipped=new();public Dictionary<string,int> recipesCooked=new();public Dictionary<string,int> craftingRecipes=new();public Dictionary<string,int[]> fishCaught=new();public List<string> mailReceived=new();public HashSet<string> eventsSeen=new();public List<int> achievements=new();public List<Quests.Quest> questLog=new();public List<Item> Items=new();public int QuestsCompleted; public bool NotifyQuests(Func<Quests.Quest,bool> check,bool onlyOneQuest=false){foreach(var quest in questLog.ToArray())check(quest);return true;} }
}
namespace Netcode { public class Net<T>{public T Value{get;set;}=default!;} }
namespace StardewValley.Quests {
public class Quest {public Netcode.Net<string> id=new();public string? _questTitle,_questDescription,_currentObjective;public Netcode.Net<bool> accepted=new(),canBeCancelled=new(),showNew=new();public Netcode.Net<int> moneyReward=new(),questType=new();public bool OnRecipeCrafted(StardewValley.CraftingRecipe recipe,StardewValley.Item item,bool probe=false)=>false;}
}
