using System.Text.Json;

namespace Companion.Bridge;
public record Condition(string Source, string Key, long Minimum = 1);
public record Goal(string Id, string QuestId, string Title, string Description, string Objective, Condition[] Conditions);
public record Plan(int Version, string SaveId, string FarmerId, string Revision, Goal[] Goals);
public static class Protocol
{
    public static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };
    public static bool Valid(Plan plan) => plan.Version == 1 && plan.Goals.Length <= 80 && plan.Revision.Length <= 128
        && plan.SaveId.Length <= 160 && plan.FarmerId.Length <= 80
        && plan.Goals.Select(g => g.QuestId).Distinct().Count() == plan.Goals.Length
        && plan.Goals.All(g => g.Id.Length <= 512 && g.QuestId.StartsWith("StardewCompanion:", StringComparison.Ordinal)
            && g.QuestId.Length == 49 && g.QuestId[17..].All(Uri.IsHexDigit)
            && !string.IsNullOrWhiteSpace(g.Title) && g.Title.Length <= 200 && g.Description.Length <= 4000 && g.Objective.Length <= 800
            && g.Conditions.Length is > 0 and <= 256
            && g.Conditions.All(c => c.Key.Length <= 160 && c.Minimum is > 0 and <= 1000000000
                && new[] { "cooked", "crafting", "fish", "shipped", "friendship", "skill", "mail", "events", "achievements", "stats" }.Contains(c.Source)));
    public static bool Complete(Goal goal, Func<Condition, long?> read) => goal.Conditions.Length > 0
        && goal.Conditions.All(c => read(c) is long value && value >= c.Minimum);
    public static void Write(string path, object value)
    {
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(value, Json));
        File.Move(temporary, path, true);
    }
}
