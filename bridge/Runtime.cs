using System.Collections;
using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using HarmonyLib;

namespace Companion.Bridge;
public static class Runtime
{
    static Assembly? game;
    static Type? game1;
    static string root = "";
    static bool attached;
    static readonly Stopwatch clock = Stopwatch.StartNew();
    static long nextTick, nextHeartbeat;
    static string revision = "", identity = "";
    static readonly HashSet<string> observed = new(), completed = new(), cancelled = new();
    static Plan? plan;
    static DateTime manifestStamp;
    public static void Attach(Assembly assembly, string directory)
    {
        if (attached) return;
        var version = assembly.GetName().Version;
        if (version is null || version.Major != 1 || version.Minor != 6 || version.Build != 15)
            throw new NotSupportedException("Live connection currently supports vanilla Stardew Valley 1.6.15 only.");
        game = assembly; root = directory; game1 = game.GetType("StardewValley.Game1", true)!;
        var update = game1.GetMethods(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Single(m => m.Name == "Update" && m.GetParameters().Length == 1);
        new Harmony("com.stardewcompanion.bridge").Patch(update, postfix: new HarmonyMethod(typeof(Runtime), nameof(Tick)));
        Directory.CreateDirectory(root);
        attached = true;
        Status("connected", null);
    }
    public static object? Unwrap(object? value)
    {
        if (value == null) return null;
        var type = value.GetType();
        return type.Namespace?.StartsWith("Netcode", StringComparison.Ordinal) == true && type.GetProperty("Value") is PropertyInfo property
            ? property.GetValue(value) : value;
    }
    public static object? Read(object? target, string name)
    {
        if (target == null) return null;
        var type = target as Type ?? target.GetType();
        var flags = BindingFlags.Public | BindingFlags.NonPublic | (target is Type ? BindingFlags.Static : BindingFlags.Instance);
        return Unwrap(type.GetField(name, flags)?.GetValue(target is Type ? null : target)
            ?? type.GetProperty(name, flags)?.GetValue(target is Type ? null : target));
    }
    static long? Number(object? value)
    {
        value = Unwrap(value);
        try { return value == null ? null : Convert.ToInt64(value); } catch { return null; }
    }
    public static IEnumerable Elements(object value) => Read(value,"Pairs") as IEnumerable ?? value as IEnumerable ?? Array.Empty<object>();
    public static long? Metric(object farmer, Condition condition)
    {
        if(condition.Source=="skill")return new[]{"farming","fishing","foraging","mining","combat"}.Contains(condition.Key)?Number(Read(farmer,condition.Key+"Level")):null;
        var field = condition.Source switch {
            "cooked" => "recipesCooked", "crafting" => "craftingRecipes", "fish" => "fishCaught",
            "shipped" => "basicShipped", "friendship" => "friendshipData", "mail" => "mailReceived",
            "events" => "eventsSeen", "achievements" => "achievements", _ => "" };
        if (condition.Source == "stats")
        {
            var stats = Read(farmer, "stats");
            if (stats == null) return null;
            var direct = Read(stats, condition.Key);
            if (direct != null) return Number(direct);
            var getter = stats.GetType().GetMethod("Get", new[] { typeof(string) });
            return getter == null ? null : Number(getter.Invoke(stats, new object[] { condition.Key }));
        }
        var record = Read(farmer, field);
        if (record is not IEnumerable) return null;
        var values=Elements(record);
        foreach (var raw in values)
        {
            var value = Unwrap(raw);
            if (condition.Source is "mail" or "events" or "achievements")
            {
                if (Convert.ToString(value) == condition.Key) return 1;
            }
            else if (Convert.ToString(Read(value, "Key")) == condition.Key)
            {
                var result = Read(value, "Value");
                return condition.Source == "friendship" ? Number(Read(result, "Points"))
                    : result is int[] fish && fish.Length > 0 ? fish[0] : Number(result);
            }
        }
        return 0;
    }
    static void Set(object target, string field, object value)
    {
        var member = target.GetType().GetField(field) ?? throw new MissingFieldException(field);
        if (member.FieldType == typeof(string)) member.SetValue(target, value);
        else member.GetValue(target)!.GetType().GetProperty("Value")!.SetValue(member.GetValue(target), value);
    }
    static void Remove(object list, object quest) => list.GetType().GetMethod("Remove", new[] { quest.GetType().BaseType == game!.GetType("StardewValley.Quests.Quest") ? quest.GetType().BaseType! : quest.GetType() })!
        .Invoke(list, new[] { quest });
    static void Status(string state, string? error) {
        try { Protocol.Write(Path.Combine(root, "status.json"), new {
            version = 1, state, error, pid = Environment.ProcessId, updatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            saveId = identity, farmerId = plan?.FarmerId, completed = completed.ToArray(), revision, gameLanguage=game==null?"en":GoalText.Language(game) }); }
        catch(IOException) { /* Losing app-owned diagnostics must never crash the game. */ }
        catch(UnauthorizedAccessException) { }
    }
    // Harmony invokes this on the original game update thread. No save files are written here.
    public static void Tick()
    {
        if (clock.ElapsedMilliseconds < nextTick) return;
        nextTick = clock.ElapsedMilliseconds + 250;
        try
        {
            var farmer = Read(game1, "player");
            if (Equals(Read(game?.GetType("StardewValley.SaveGame"),"IsProcessing"),true)) return;
            if(Equals(Read(game1,"IsMultiplayer"),true)){if(clock.ElapsedMilliseconds>=nextHeartbeat){Status("error","The live connection currently supports single-player sessions only.");nextHeartbeat=clock.ElapsedMilliseconds+5000;}return;}
            if (farmer == null || Number(Read(game1, "gameMode")) != 3 || Read(game1, "currentLocation") == null) {
                if(identity!=""){identity="";plan=null;observed.Clear();completed.Clear();cancelled.Clear();revision="";}
                if(clock.ElapsedMilliseconds>=nextHeartbeat){Status("connected",null);nextHeartbeat=clock.ElapsedMilliseconds+5000;}
                return;
            }
            var farmerId = Convert.ToString(Read(farmer, "UniqueMultiplayerID"))!;
            var host = Read(game1, "MasterPlayer");
            var saveId = Convert.ToString(Read(game1, "uniqueIDForThisGame")) + ":" + Convert.ToString(Read(host, "UniqueMultiplayerID"));
            FarmTransfer.Process(game!,game1!,root,saveId,farmerId,farmer);
            var key = saveId + ":" + farmerId;
            var path = Path.Combine(root, "plans", Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(key))).ToLowerInvariant() + ".json");
            if (identity != key) { identity = key; revision = ""; plan = null; observed.Clear(); completed.Clear(); cancelled.Clear(); manifestStamp = default; }
            if (File.Exists(path) && File.GetLastWriteTimeUtc(path) != manifestStamp)
            {
                if (new FileInfo(path).Length > 1048576) throw new InvalidDataException("Plan exceeds size limit");
                var next = JsonSerializer.Deserialize<Plan>(File.ReadAllText(path), Protocol.Json)!;
                if (!Protocol.Valid(next) || next.SaveId != saveId || next.FarmerId != farmerId) throw new InvalidDataException("Invalid or mismatched plan");
                var retained = next.Goals.Select(g => g.QuestId).ToHashSet();
                observed.IntersectWith(retained);
                cancelled.IntersectWith(retained);
                completed.IntersectWith(next.Goals.Select(g => g.Id));
                plan = next; revision = next.Revision; manifestStamp = File.GetLastWriteTimeUtc(path);
            }
            if (plan == null) {
                // Publish the loaded identity so Companion can send this farm's first plan.
                if(clock.ElapsedMilliseconds>=nextHeartbeat){Status("active",null);nextHeartbeat=clock.ElapsedMilliseconds+5000;}
                return;
            }
            var log = Read(farmer, "questLog")!;
            var quests = Elements(log).Cast<object>().ToArray();
            var changed = false;
            var allowed = plan.Goals.Select(g => g.QuestId).ToHashSet();
            foreach (var quest in quests)
                if (Read(quest, "id") is string oldId && oldId.StartsWith("StardewCompanion:", StringComparison.Ordinal) && !allowed.Contains(oldId))
                { Remove(log, quest); changed = true; }
            foreach (var goal in plan.Goals)
            {
                var localized=GoalText.Resolve(game!,game1!,goal);
                var quest = quests.FirstOrDefault(q => Equals(Read(q, "id"), goal.QuestId));
                if(quest!=null && !Equals(Read(quest,"_questTitle"),"Companion: "+localized.Title)) {Set(quest,"_questTitle","Companion: "+localized.Title);Set(quest,"_questDescription",localized.Description);Set(quest,"_currentObjective",localized.Title);changed=true;}
                if (Protocol.Complete(goal, c => Metric(farmer, c)))
                {
                    if (quest != null) { Remove(log, quest); changed = true; }
                    changed |= completed.Add(goal.Id);
                }
                else
                {
                    // Friendship and other current-state metrics can fall below their threshold.
                    if (completed.Remove(goal.Id)) {
                        observed.Remove(goal.QuestId); cancelled.Remove(goal.QuestId); changed = true;
                    }
                    if (quest != null) { observed.Add(goal.QuestId); continue; }
                    if (observed.Contains(goal.QuestId)) { cancelled.Add(goal.QuestId); continue; }
                    if (cancelled.Contains(goal.QuestId)) continue;
                    quest = Activator.CreateInstance(game!.GetType("StardewValley.Quests.Quest", true)!)!;
                    Set(quest, "id", goal.QuestId); Set(quest, "_questTitle", "Companion: " + localized.Title);
                    Set(quest, "_questDescription", localized.Description); Set(quest, "_currentObjective", localized.Title);
                    Set(quest, "accepted", true); Set(quest, "canBeCancelled", true); Set(quest, "showNew", true);
                    Set(quest, "questType", 1);
                    log.GetType().GetMethod("Add")!.Invoke(log, new[] { quest }); changed = true;
                }
                observed.Add(goal.QuestId);
            }
            if (changed)
            {
                var box = Read(game1, "dayTimeMoneyBox");
                box?.GetType().GetField("questsDirty")?.SetValue(box, true);
            }
            if (changed || clock.ElapsedMilliseconds >= nextHeartbeat) { Status("active", null); nextHeartbeat = clock.ElapsedMilliseconds + 5000; }
        }
        catch (Exception error) { if (clock.ElapsedMilliseconds >= nextHeartbeat) { Status("error", error.GetBaseException().Message); nextHeartbeat = clock.ElapsedMilliseconds + 5000; } }
    }
}
