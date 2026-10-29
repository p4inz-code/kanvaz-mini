# Stops only the Kanvaz Mini test instance (matched by its debugging port 9444). Never other Electron apps.
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -like '*remote-debugging-port=9444*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
