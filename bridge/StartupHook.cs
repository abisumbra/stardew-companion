using System.Reflection;
using System.Runtime.Loader;

// The .NET host requires this exact unnamespaced entry point.
public static class StartupHook
{
    public static void Initialize()
    {
        var folder = Path.GetDirectoryName(typeof(StartupHook).Assembly.Location)!;
        AssemblyLoadContext.Default.Resolving += (context, name) =>
            name.Name == "0Harmony" ? context.LoadFromAssemblyPath(Path.Combine(folder, "0Harmony.dll")) : null;
        var root = Environment.GetEnvironmentVariable("STARDEW_COMPANION_DATA");
        if (string.IsNullOrEmpty(root) || !Path.IsPathFullyQualified(root)) return;
        AppDomain.CurrentDomain.AssemblyLoad += (_, args) => TryAttach(args.LoadedAssembly, root);
        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies()) TryAttach(assembly, root);
    }
    static void TryAttach(Assembly assembly, string root)
    {
        if (assembly.GetName().Name != "Stardew Valley") return;
        try { Companion.Bridge.Runtime.Attach(assembly, root); }
        catch (Exception error)
        {
            try { Directory.CreateDirectory(root); File.WriteAllText(Path.Combine(root, "startup-error.txt"), error.ToString()); Companion.Bridge.Protocol.Write(Path.Combine(root,"status.json"),new{state="error",error=error.GetBaseException().Message,pid=Environment.ProcessId,updatedAt=DateTimeOffset.UtcNow.ToUnixTimeSeconds()}); }
            catch { /* Diagnostics must never prevent the game starting. */ }
        }
    }
}
