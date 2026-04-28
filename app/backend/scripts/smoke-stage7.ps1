$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host 'LOGIN OK'

$runTag = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$seed = [Convert]::ToUInt64($runTag, 16)
$tailA = ($seed % 10000000).ToString('D7')
$tailB = (($seed + 1) % 10000000).ToString('D7')
$tailC = (($seed + 2) % 10000000).ToString('D7')
$phoneA = "+7 (495) $($tailA.Substring(0, 3))-$($tailA.Substring(3, 2))-$($tailA.Substring(5, 2))"
$phoneB = "+7 (495) $($tailB.Substring(0, 3))-$($tailB.Substring(3, 2))-$($tailB.Substring(5, 2))"
$phoneC = "+7 (495) $($tailC.Substring(0, 3))-$($tailC.Substring(3, 2))-$($tailC.Substring(5, 2))"
$fileName = "stage7-smoke-$runTag.csv"
$sourceLabel = "stage7-smoke-$runTag"
$dedupExternalId = "stage7-$runTag"

$stats = Invoke-RestMethod -Uri "$base/stats" -Headers $T
if (-not $stats -or -not $stats.pipeline -or -not $stats.operations -or -not $stats.audit) {
  throw 'Stats response does not contain expected sections (pipeline/operations/audit)'
}
if ($null -eq $stats.pipeline.total -or $null -eq $stats.pipeline.active) {
  throw 'Stats response is missing pipeline totals'
}
Write-Host "STATS OK total=$($stats.pipeline.total) active=$($stats.pipeline.active)"

$analyticsViews = @('view-stale-leads', 'view-lost-leads', 'view-active-reservations', 'view-manager-load')
foreach ($viewId in $analyticsViews) {
  $analytics = Invoke-RestMethod -Uri "$base/stats/analytics?viewId=$viewId&sampleTake=6" -Headers $T
  if (-not $analytics -or -not $analytics.summary -or $null -eq $analytics.managers -or $null -eq $analytics.samples) {
    throw "Stats analytics response is invalid for viewId=$viewId"
  }
  if ($analytics.viewId -ne $viewId) {
    throw "Stats analytics returned unexpected viewId=$($analytics.viewId), expected=$viewId"
  }
  Write-Host "ANALYTICS($viewId) OK total=$($analytics.summary.total) samples=$($analytics.samples.Count)"
}

$rows = @(
  @{ name = "Stage7 Import A $runTag"; phone = $phoneA; company = "Stage7 LLC $runTag"; externalSourceId = $dedupExternalId },
  @{ name = "Stage7 Import B $runTag"; phone = $phoneB; company = "Stage7 LLC $runTag"; externalSourceId = $dedupExternalId }
)

$previewBody = @{
  entityType = 'lead'
  fileName = $fileName
  sourceLabel = $sourceLabel
  rows = $rows
} | ConvertTo-Json -Depth 10

$preview = Invoke-RestMethod -Method Post -Uri "$base/imports/preview" -Headers $T -ContentType 'application/json' -Body $previewBody
if (-not $preview.summary -or $preview.summary.totalRows -lt 1) {
  throw 'Import preview did not return a valid summary'
}
Write-Host "PREVIEW OK total=$($preview.summary.totalRows) valid=$($preview.summary.validRows)"

$runBody = @{
  entityType = 'lead'
  fileName = $fileName
  sourceLabel = $sourceLabel
  dedupPolicy = 'skip'
  rows = $rows
  mapping = $preview.mapping
} | ConvertTo-Json -Depth 10

$run = Invoke-RestMethod -Method Post -Uri "$base/imports/run" -Headers $T -ContentType 'application/json' -Body $runBody
if (-not $run.importId) {
  throw 'Import run did not return importId'
}
if ($run.summary.totalRows -ne $rows.Count) {
  throw "Expected totalRows=$($rows.Count), got $($run.summary.totalRows)"
}
if (($run.summary.imported + $run.summary.skipped + $run.summary.failed) -ne $rows.Count) {
  throw 'Import summary accounting mismatch (imported + skipped + failed)'
}
if ($run.summary.imported -ne 1 -or $run.summary.skipped -ne 1 -or $run.summary.failed -ne 0) {
  throw "Expected imported=1 skipped=1 failed=0, got imported=$($run.summary.imported) skipped=$($run.summary.skipped) failed=$($run.summary.failed)"
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

$invalidRows = @(
  @{ name = "Stage7 Invalid $runTag"; phone = ''; company = "Stage7 Invalid LLC $runTag"; externalSourceId = "stage7-invalid-$runTag" },
  @{ name = "Stage7 Valid $runTag"; phone = $phoneC; company = "Stage7 Invalid LLC $runTag"; externalSourceId = "stage7-valid-$runTag" }
)

$invalidPreviewBody = @{
  entityType = 'lead'
  fileName = "stage7-invalid-$runTag.csv"
  sourceLabel = "stage7-invalid-$runTag"
  rows = $invalidRows
} | ConvertTo-Json -Depth 10

$invalidPreview = Invoke-RestMethod -Method Post -Uri "$base/imports/preview" -Headers $T -ContentType 'application/json' -Body $invalidPreviewBody
if (-not $invalidPreview.summary -or $invalidPreview.summary.errorRows -lt 1) {
  throw 'Import preview for invalid rows did not produce validation errors'
}
Write-Host "PREVIEW INVALID OK errors=$($invalidPreview.summary.errorRows)"

$invalidRunBody = @{
  entityType = 'lead'
  fileName = "stage7-invalid-$runTag.csv"
  sourceLabel = "stage7-invalid-$runTag"
  dedupPolicy = 'skip'
  rows = $invalidRows
  mapping = $invalidPreview.mapping
} | ConvertTo-Json -Depth 10

$invalidRun = Invoke-RestMethod -Method Post -Uri "$base/imports/run" -Headers $T -ContentType 'application/json' -Body $invalidRunBody
if (-not $invalidRun.importId) {
  throw 'Invalid import run did not return importId'
}
if ($invalidRun.summary.totalRows -ne $invalidRows.Count) {
  throw "Invalid import summary totalRows mismatch: expected=$($invalidRows.Count) got=$($invalidRun.summary.totalRows)"
}
if ($invalidRun.summary.failed -lt 1) {
  throw 'Invalid import run must contain at least one failed row'
}
if ($invalidRun.summary.imported -lt 1) {
  throw 'Invalid import run must still import valid rows from mixed batch'
}
Write-Host "RUN INVALID OK importId=$($invalidRun.importId) imported=$($invalidRun.summary.imported) failed=$($invalidRun.summary.failed)"

$invalidReport = Invoke-RestMethod -Uri "$base/imports/$($invalidRun.importId)/report" -Headers $T
if (-not $invalidReport.issues -or $invalidReport.issues.Count -lt 1) {
  throw 'Invalid import report does not contain issues'
}
if (-not $invalidReport.errorReportCsv) {
  throw 'Invalid import report did not provide errorReportCsv payload'
}
Write-Host "REPORT INVALID OK issues=$($invalidReport.issues.Count)"

$importedEvents = Invoke-RestMethod -Uri "$base/activity/search?action=imported&entityId=$($run.importId)&take=10" -Headers $T
if (-not $importedEvents -or $importedEvents.total -lt 1) {
  throw 'Activity log does not contain imported event for this importId'
}
Write-Host "AUDIT(imported) OK total=$($importedEvents.total)"

$invalidImportedEvents = Invoke-RestMethod -Uri "$base/activity/search?action=imported&entityId=$($invalidRun.importId)&take=10" -Headers $T
if (-not $invalidImportedEvents -or $invalidImportedEvents.total -lt 1) {
  throw 'Activity log does not contain imported event for invalid import run'
}
Write-Host "AUDIT(imported-invalid) OK total=$($invalidImportedEvents.total)"

$criticalActions = @('created', 'updated', 'stage_changed', 'reservation_set', 'reservation_released', 'completed', 'unqualified', 'imported')
foreach ($action in $criticalActions) {
  $resp = Invoke-RestMethod -Uri "$base/activity/search?action=$action&take=1" -Headers $T
  if (-not $resp -or $resp.total -lt 1) {
    throw "Audit coverage gap: expected at least one activity event for action=$action"
  }
  Write-Host "AUDIT($action) total=$($resp.total)"
}

Write-Host '=== STAGE 7 IMPORTS+AUDIT OK ==='
