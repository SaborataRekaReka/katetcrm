$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host 'LOGIN OK'

$stats = Invoke-RestMethod -Uri "$base/stats" -Headers $T
if (-not $stats -or -not $stats.pipeline -or -not $stats.operations -or -not $stats.audit) {
  throw 'Stats response does not contain expected sections (pipeline/operations/audit)'
}
if ($null -eq $stats.pipeline.total -or $null -eq $stats.pipeline.active) {
  throw 'Stats response is missing pipeline totals'
}
Write-Host "STATS OK total=$($stats.pipeline.total) active=$($stats.pipeline.active)"

$rows = @(
  @{ name = 'Stage7 Import A'; phone = '+7 (495) 901-11-21'; company = 'Stage7 LLC' },
  @{ name = 'Stage7 Import B'; phone = '+7 (495) 901-11-21'; company = 'Stage7 LLC' }
)

$previewBody = @{
  entityType = 'lead'
  fileName = 'stage7-smoke.csv'
  sourceLabel = 'stage7-smoke'
  rows = $rows
} | ConvertTo-Json -Depth 10

$preview = Invoke-RestMethod -Method Post -Uri "$base/imports/preview" -Headers $T -ContentType 'application/json' -Body $previewBody
if (-not $preview.summary -or $preview.summary.totalRows -lt 1) {
  throw 'Import preview did not return a valid summary'
}
Write-Host "PREVIEW OK total=$($preview.summary.totalRows) valid=$($preview.summary.validRows)"

$runBody = @{
  entityType = 'lead'
  fileName = 'stage7-smoke.csv'
  sourceLabel = 'stage7-smoke'
  dedupPolicy = 'skip'
  rows = $rows
  mapping = $preview.mapping
} | ConvertTo-Json -Depth 10

$run = Invoke-RestMethod -Method Post -Uri "$base/imports/run" -Headers $T -ContentType 'application/json' -Body $runBody
if (-not $run.importId) {
  throw 'Import run did not return importId'
}
if ($run.summary.imported -lt 1) {
  throw "Expected imported >= 1, got $($run.summary.imported)"
}
Write-Host "RUN OK importId=$($run.importId) imported=$($run.summary.imported)"

$report = Invoke-RestMethod -Uri "$base/imports/$($run.importId)/report" -Headers $T
if (-not $report -or $report.importId -ne $run.importId) {
  throw 'Import report endpoint returned unexpected payload'
}
if (-not $report.summary -or $report.summary.imported -ne $run.summary.imported) {
  throw 'Import report summary does not match run summary'
}
if (-not $report.mapping) {
  throw 'Import report does not contain mapping metadata'
}
Write-Host "REPORT OK activityId=$($report.activityId)"

$importedEvents = Invoke-RestMethod -Uri "$base/activity/search?action=imported&entityId=$($run.importId)&take=10" -Headers $T
if (-not $importedEvents -or $importedEvents.total -lt 1) {
  throw 'Activity log does not contain imported event for this importId'
}
Write-Host "AUDIT(imported) OK total=$($importedEvents.total)"

$criticalActions = @('created', 'updated', 'stage_changed', 'reservation_set', 'reservation_released', 'completed', 'unqualified', 'imported')
foreach ($action in $criticalActions) {
  $resp = Invoke-RestMethod -Uri "$base/activity/search?action=$action&take=1" -Headers $T
  if (-not $resp -or $resp.total -lt 1) {
    throw "Audit coverage gap: expected at least one activity event for action=$action"
  }
  Write-Host "AUDIT($action) total=$($resp.total)"
}

Write-Host '=== STAGE 7 IMPORTS+AUDIT OK ==='
