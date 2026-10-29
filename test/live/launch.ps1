param([string]$Profile = "$env:TEMP\kanvaz-mini-test-profile", [string]$AppExe = "")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $Profile | Out-Null
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
# AppExe: a built Kanvaz Mini.exe to test instead of the source tree
$runner = if ($AppExe) { $AppExe } else { Join-Path $root 'node_modules\electron\dist\electron.exe' }
$argList = @()
if (-not $AppExe) { $argList += $root }
$argList += @("--user-data-dir=$Profile", '--remote-debugging-port=9444', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows')
if ($env:KM_FILES) { $argList += $env:KM_FILES.Split(';') }
Start-Process -FilePath $runner -ArgumentList $argList -WorkingDirectory $root
