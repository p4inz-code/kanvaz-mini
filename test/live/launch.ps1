param([string]$Profile = "$env:TEMP\kanvaz-mini-test-profile", [string]$Exe = "")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $Profile | Out-Null
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$exe = if ($Exe) { $Exe } else { Join-Path $root 'node_modules\electron\dist\electron.exe' }
$args = @(); if (-not $Exe) { $args += $root }
$args += @("--user-data-dir=$Profile", '--remote-debugging-port=9444', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows')
if ($args.Count -gt 0 -and $env:KM_FILES) { $args += $env:KM_FILES.Split(';') }
Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $root
