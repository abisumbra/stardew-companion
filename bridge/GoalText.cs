using System.Reflection;
using System.Text.Json;
namespace Companion.Bridge;
// Only authored catalogs are embedded. Item names come from the running game's current language.
public static class GoalText
{
    record Resources(Dictionary<string,Dictionary<string,string>> Languages,Dictionary<string,string> Labels);
    static readonly Resources text=JsonSerializer.Deserialize<Resources>(typeof(GoalText).Assembly.GetManifestResourceStream("Companion.Bridge.GoalText.json")!,Protocol.Json)!;
    static readonly Dictionary<string,(string Title,string Description)> cache=new();
    public static string Language(Assembly game)=>Convert.ToString(Runtime.Read(game.GetType("StardewValley.LocalizedContentManager"),"CurrentLanguageCode"))??"en";
    public static (string Title,string Description) Resolve(Assembly game,Type game1,Goal goal)
    {
        var language=Language(game);var key=language+":"+goal.Id;
        if(cache.TryGetValue(key,out var old))return old;
        var catalog=text.Languages.GetValueOrDefault(language)??text.Languages["en"];
        string Message(string id)=>catalog.GetValueOrDefault(id)??text.Languages["en"].GetValueOrDefault(id)??id;
        var condition=goal.Conditions[0];var label=text.Labels.GetValueOrDefault(goal.Id)??new string(condition.Key.Where(c=>c<128).ToArray());
        try
        {
            if(condition.Source is "cooked" or "fish" or "shipped")
            {
                var registry=game.GetType("StardewValley.ItemRegistry",true)!;
                var method=registry.GetMethods().First(m=>m.Name=="GetData"&&m.GetParameters().Length==1);
                var data=method.Invoke(null,new object[]{"(O)"+condition.Key});label=Convert.ToString(Runtime.Read(data,"DisplayName"))??label;
            }
            else if(condition.Source=="crafting")
            {
                var recipe=Activator.CreateInstance(game.GetType("StardewValley.CraftingRecipe",true)!,condition.Key,false)!;
                var data=recipe.GetType().GetMethod("GetItemData")!.Invoke(recipe,new object[]{true});label=Convert.ToString(Runtime.Read(data,"DisplayName"))??label;
            }
            else if(condition.Source=="achievements")
            {
                var data=game.GetType("StardewValley.DataLoader",true)!.GetMethod("Achievements")!.Invoke(null,new[]{Runtime.Read(game1,"content")})!;
                foreach(var entry in Runtime.Elements(data))if(Convert.ToString(Runtime.Read(entry,"Key"))==condition.Key){label=Convert.ToString(Runtime.Read(entry,"Value"))!.Split('/')[0];break;}
            }
            else if(condition.Source=="friendship")
            {
                var lookup=game1.GetMethods().First(m=>m.Name=="getCharacterFromName"&&!m.IsGenericMethod&&m.GetParameters().Length==3);
                var npc=lookup.Invoke(null,new object[]{condition.Key,false,false});label=Convert.ToString(Runtime.Read(npc,"displayName"))??label;
            }
        }
        catch { /* An ASCII canonical label is safer than text from a different game font. */ }
        var template=condition.Source switch {"cooked"=>"Cook {item}","crafting"=>"Craft {item}","fish"=>"Catch {item}","shipped"=>"Ship {item}","friendship"=>"Reach {count} hearts with {item}","skill"=>"Reach level {count}: {item}",_=>"{item}"};
        var title=Message(template).Replace("{item}",label).Replace("{count}",(condition.Source=="friendship"?condition.Minimum/250:condition.Minimum).ToString());
        var result=(title,Message("The Companion connection removes this task when its action record is complete. No reward."));cache[key]=result;return result;
    }
}
