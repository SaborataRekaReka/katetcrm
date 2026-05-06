$ErrorActionPreference='Stop'
$base='http://localhost:3001/api/v1'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }

$types = Invoke-RestMethod -Uri "$base/equipment-types" -Headers $T
$units = Invoke-RestMethod -Uri "$base/equipment-units" -Headers $T
if (-not $types -or $types.Count -eq 0) { throw 'No equipment types for smoke flow' }
if (-not $units -or $units.Count -eq 0) { throw 'No equipment units for smoke flow' }

$type = $types | Select-Object -First 1
$unit = $units | Where-Object { $_.equipmentTypeId -eq $type.id } | Select-Object -First 1
if (-not $unit) { $unit = $units | Select-Object -First 1 }
if (-not $unit) { throw 'No equipment unit available for smoke flow' }
Write-Host "USING type=$($type.name) unit=$($unit.name)"

# fresh lead for this run
$body = @{ contactName='Flow Test'; contactCompany='Flow LLC'; contactPhone='+7 (812) 999-88-77'; source='manual' } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body
$id = $created.lead.id
Write-Host "NEW LEAD id=$id stage=$($created.lead.stage)"

$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)
Write-Host '  -> application'

$apps = Invoke-RestMethod -Uri "$base/applications?scope=all&leadId=$id" -Headers $T
if (-not $apps.items -or $apps.items.Count -eq 0) { throw 'Application was not created after lead->application' }
$appId = $apps.items[0].id
Write-Host "APP id=$appId"

$itemBody = @{ equipmentTypeLabel=$type.name; equipmentTypeId=$type.id; quantity=1; shiftCount=1; readyForReservation=$true; sourcingType='own' } | ConvertTo-Json
$item = Invoke-RestMethod -Method Post -Uri "$base/applications/$appId/items" -Headers $T -ContentType 'application/json' -Body $itemBody
Write-Host "ITEM id=$($item.id)"

$start = (Get-Date).AddDays(1).ToString('s')
$end = (Get-Date).AddDays(1).AddHours(8).ToString('s')
$resBody = @{ applicationItemId=$item.id; sourcingType='own'; equipmentTypeId=$type.id; equipmentUnitId=$unit.id; plannedStart=$start; plannedEnd=$end; internalStage='unit_defined' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $resBody
Write-Host "RESERVATION id=$($res.id)"

foreach ($s in 'reservation','departure') {
  $r = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage=$s} | ConvertTo-Json)
  Write-Host "  -> $($r.stage)"
}

$deps = Invoke-RestMethod -Uri "$base/departures?applicationId=$appId" -Headers $T
if (-not $deps.items -or $deps.items.Count -eq 0) { throw 'Departure was not created after reservation->departure' }
$departureId = $deps.items[0].id

$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/start" -Headers $T -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/arrive" -Headers $T -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
$completedDeparture = Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/complete" -Headers $T -ContentType 'application/json' -Body (@{outcome='completed'; completionNote='smoke flow'} | ConvertTo-Json)
if (-not $completedDeparture.completion -or -not $completedDeparture.completion.id) {
  throw 'Completion was not created after departure complete'
}
Write-Host '  -> completed'

$leadAfter = Invoke-RestMethod -Uri "$base/leads/$id" -Headers $T
Write-Host "LEAD FINAL STAGE=$($leadAfter.stage)"
if ($leadAfter.stage -ne 'completed') {
  throw "Expected lead stage completed after departure completion, got $($leadAfter.stage)"
}

try {
  Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='lead'} | ConvertTo-Json) | Out-Null
  Write-Host "BLOCK FAILED"
} catch {
  Write-Host "BLOCK OK (completed is terminal)"
}

$act = Invoke-RestMethod -Uri "$base/activity?entityType=lead&entityId=$id" -Headers $T
Write-Host "ACTIVITY count=$($act.Count)"

# unqualified branch
$body2 = @{ contactName='Unqual Test'; contactPhone='+7 (999) 000-11-22'; source='manual' } | ConvertTo-Json
$lead2 = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body2
$id2 = $lead2.lead.id
$r = Invoke-RestMethod -Method Post -Uri "$base/leads/$id2/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='unqualified'; reason='test reason'} | ConvertTo-Json)
Write-Host "UNQUAL flow: $($r.stage)"

Write-Host "=== FLOW OK ==="
