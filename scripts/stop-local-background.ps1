param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$taskRepo = Split-Path -Parent $PSScriptRoot
$taskManifestPath = Join-Path $taskRepo '.env.local-processes.json'
if (!(Test-Path -LiteralPath $taskManifestPath)) {
    Write-Output 'No background process record found. Stop terminal sessions with Ctrl+C.'
    exit 0
}
$taskManifest = Get-Content -Raw -LiteralPath $taskManifestPath | ConvertFrom-Json
foreach ($taskComponent in 'frontend', 'gateway', 'api') {
    $taskRecord = $taskManifest.$taskComponent
    if (!$taskRecord) { continue }
    $taskProcess = Get-Process -Id $taskRecord.id -ErrorAction SilentlyContinue
    if (!$taskProcess) { Write-Output "$taskComponent already stopped"; continue }
    $taskRecordedStart = ([DateTimeOffset]$taskRecord.startedAt).UtcDateTime
    if ($taskProcess.ProcessName -ne $taskRecord.name -or
        [Math]::Abs(($taskProcess.StartTime.ToUniversalTime() - $taskRecordedStart).TotalSeconds) -gt 1) {
        Write-Warning "Skipping $taskComponent because the process identity no longer matches."
        continue
    }
    if ($CheckOnly) { Write-Output "$taskComponent running; saved process identity matches" }
    else { Stop-Process -Id $taskProcess.Id; Write-Output "$taskComponent stopped" }
}
