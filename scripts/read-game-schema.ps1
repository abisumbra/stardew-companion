param([Parameter(Mandatory=$true)][string]$GamePath)
# Serialization metadata only: no game constructors, methods or initializers are invoked.
$assembly = [System.Reflection.Assembly]::LoadFrom((Join-Path $GamePath 'StardewValley.GameData.dll'))
$schemas = @{}
function Get-FieldSchema([Type]$fieldType) {
    if ($fieldType.IsEnum) { return 'enum' }
    if ($fieldType.IsGenericType) { return @{kind=$fieldType.Name.Split('`')[0];args=@($fieldType.GetGenericArguments() | ForEach-Object { Get-FieldSchema $_ })} }
    if ($fieldType.Namespace.StartsWith('StardewValley.GameData')) { return $fieldType.FullName }
    return $fieldType.Name
}
foreach ($type in $assembly.GetTypes()) {
    if (-not $type.IsPublic) { continue }
    if ($type.IsEnum) { $values=@{}; foreach($field in $type.GetFields([System.Reflection.BindingFlags]'Public,Static')) {$values[[string]$field.GetRawConstantValue()]=$field.Name}; $schemas[$type.FullName] = @{kind='enum';values=$values}; continue }
    $members = @()
    foreach ($prop in $type.GetProperties([System.Reflection.BindingFlags]'Public,Instance,DeclaredOnly')) {
        if ($prop.GetIndexParameters().Length -gt 0 -or -not $prop.CanRead) { continue }
        if (@($prop.GetCustomAttributesData() | Where-Object { $_.AttributeType.Name -eq 'ContentSerializerIgnoreAttribute' }).Count) { continue }
        $members += @{name=$prop.Name;type=(Get-FieldSchema $prop.PropertyType)}
    }
    foreach ($field in $type.GetFields([System.Reflection.BindingFlags]'Public,Instance,DeclaredOnly')) {
        if ($field.IsInitOnly -or @($field.GetCustomAttributesData() | Where-Object { $_.AttributeType.Name -eq 'ContentSerializerIgnoreAttribute' }).Count) { continue }
        $members += @{name=$field.Name;type=(Get-FieldSchema $field.FieldType)}
    }
    $base = if ($type.BaseType.Namespace -like 'StardewValley.GameData*') {$type.BaseType.FullName} else {$null}
    $schemas[$type.FullName] = @{base=$base;members=$members}
}
$schemas | ConvertTo-Json -Depth 60 | Set-Content -LiteralPath (Join-Path $PSScriptRoot '../src-tauri/src/artwork/schema.json') -Encoding utf8
Write-Output "$($schemas.Count) public serialization schemas read"
