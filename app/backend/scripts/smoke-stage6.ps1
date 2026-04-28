$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host 'LOGIN OK'

$externalId = "STAGE6-$([Guid]::NewGuid().ToString('N').Substring(0, 12))"
$ingestBody = @{
  channel = 'site'
  externalId = $externalId
  correlationId = "corr-$externalId"
  payload = @{
    lead = @{
      contactName = 'Stage6 Integration Smoke'
      contactPhone = '+7 (495) 800-11-22'
      contactCompany = 'Stage6 LLC'
      comment = 'stage6 ingest smoke'
    }
    eventTime = (Get-Date).ToString('o')
  }
} | ConvertTo-Json -Depth 10

$first = Invoke-RestMethod -Method Post -Uri "$base/integrations/events/ingest" -ContentType 'application/json' -Body $ingestBody
if (-not $first.event -or -not $first.event.id) {
  throw 'Ingest response does not include event.id'
}
if ($first.deduplicated) {
  throw 'First ingest unexpectedly marked as deduplicated'
}
Write-Host "INGEST #1 id=$($first.event.id) status=$($first.event.status)"

$second = Invoke-RestMethod -Method Post -Uri "$base/integrations/events/ingest" -ContentType 'application/json' -Body $ingestBody
if (-not $second.deduplicated) {
  throw 'Second ingest is expected to be deduplicated'
}
if ($second.event.id -ne $first.event.id) {
  throw 'Deduplicated ingest returned a different event id'
}
Write-Host "IDEMPOTENCY OK event=$($second.event.id)"

$list = Invoke-RestMethod -Uri "$base/integrations/events?channel=site&query=$externalId&take=20" -Headers $T
if (-not $list -or $list.total -lt 1) {
  throw 'Expected at least one integration event in list()'
}
Write-Host "LIST OK total=$($list.total)"

$eventId = $first.event.id
$event = Invoke-RestMethod -Uri "$base/integrations/events/$eventId" -Headers $T
if (-not $event -or $event.id -ne $eventId) {
  throw 'getById did not return expected event'
}
Write-Host "GET BY ID OK status=$($event.status)"

$retryBlocked = $false
try {
  Invoke-RestMethod -Method Post -Uri "$base/integrations/events/$eventId/retry" -Headers $T -ContentType 'application/json' -Body (@{ reason = 'stage6 smoke guard check' } | ConvertTo-Json) | Out-Null
} catch {
  $retryBlocked = $true
  Write-Host 'RETRY GUARD OK'
}
if (-not $retryBlocked) {
  throw 'Retry should be blocked for non-failed events'
}

$replayBlocked = $false
try {
  Invoke-RestMethod -Method Post -Uri "$base/integrations/events/$eventId/replay" -Headers $T -ContentType 'application/json' -Body (@{ reason = 'stage6 smoke guard check' } | ConvertTo-Json) | Out-Null
} catch {
  $replayBlocked = $true
  Write-Host 'REPLAY GUARD OK'
}
if (-not $replayBlocked) {
  throw 'Replay should be blocked for non-failed events'
}

Write-Host '=== STAGE 6 INTEGRATIONS OK ==='
