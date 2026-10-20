param([Parameter(Mandatory=$true)][string]$Installer, [string]$PreviousInstaller)
$ErrorActionPreference = 'Stop'
# This exercises registry/install changes only on an ephemeral GitHub Windows runner.
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or !$env:RUNNER_TEMP) {
  throw 'Installer smoke tests require an ephemeral GitHub Windows runner.'
}
$workspace = [IO.Path]::GetFullPath($env:GITHUB_WORKSPACE).TrimEnd('\') + '\'
$setup = (Resolve-Path -LiteralPath $Installer).Path
if (!$setup.StartsWith($workspace, [StringComparison]::OrdinalIgnoreCase)) { throw 'Installer must be inside the checked-out workspace.' }
$testRoot = Join-Path $env:RUNNER_TEMP ('companion-install-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$installPath = Join-Path $testRoot 'application'
$dataPath = Join-Path $env:APPDATA 'com.stardewcompanion.app'
if (Test-Path -LiteralPath $dataPath) { throw 'Refusing to use a runner that already has Companion data.' }
New-Item -ItemType Directory -Path $dataPath | Out-Null
$database = Join-Path $dataPath 'companion.sqlite3'
python -c 'import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute("create table marker(value text)"); c.execute("insert into marker values (?)",("synthetic-install-test",)); c.commit(); c.close()' $database
if ($LASTEXITCODE -ne 0) { throw 'Could not create synthetic database.' }
$before = (Get-FileHash -LiteralPath $database -Algorithm SHA256).Hash
function Install-Preview([string]$path) {
  $process = Start-Process -FilePath $path -ArgumentList @('/S', "/D=$installPath") -Wait -PassThru -WindowStyle Hidden
  if ($process.ExitCode -notin @(0,3010)) { throw "Installer failed: $($process.ExitCode)" }
  if (!(Test-Path -LiteralPath (Join-Path $installPath 'stardew-companion.exe'))) { throw 'Installed executable missing.' }
  if ((Get-FileHash -LiteralPath $database -Algorithm SHA256).Hash -ne $before) { throw 'Installer changed application data.' }
}
if ($PreviousInstaller) {
  $previous = (Resolve-Path -LiteralPath $PreviousInstaller).Path
  if (!$previous.StartsWith($workspace,[StringComparison]::OrdinalIgnoreCase)) { throw 'Previous installer must be inside the workspace.' }
  Install-Preview $previous
} else { Install-Preview $setup }
Install-Preview $setup
$uninstaller = Get-ChildItem -LiteralPath $installPath -Filter '*uninstall*.exe' | Select-Object -First 1
if (!$uninstaller) { throw 'Uninstaller missing.' }
$process = Start-Process -FilePath $uninstaller.FullName -ArgumentList @('/S', "_?=$installPath") -Wait -PassThru -WindowStyle Hidden
if ($process.ExitCode -notin @(0,3010)) { throw 'Uninstaller failed.' }
if (Test-Path -LiteralPath (Join-Path $installPath 'stardew-companion.exe')) { throw 'Uninstall left the application executable.' }
if ((Get-FileHash -LiteralPath $database -Algorithm SHA256).Hash -ne $before) { throw 'Uninstall changed retained application data.' }
Write-Output 'Installation, replacement and removal passed with byte-identical synthetic application data.'
