namespace StardewValley;
public static class LocalizedContentManager { public static string CurrentLanguageCode {get;set;}="tr"; }
public record ParsedItemData(string DisplayName);
public static class ItemRegistry { public static ParsedItemData GetData(string id)=>new(id=="(O)390"?(LocalizedContentManager.CurrentLanguageCode=="tr"?"Taş":"Stone"):id); }
