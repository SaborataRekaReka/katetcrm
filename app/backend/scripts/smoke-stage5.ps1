$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host "LOGIN OK"

$types = Invoke-RestMethod -Uri "$base/equipment-types" -Headers $T
$units = Invoke-RestMethod -Uri "$base/equipment-units" -Headers $T
if (-not $types -or $types.Count -eq 0) { throw "Нет equipment types для smoke stage5" }
if (-not $units -or $units.Count -eq 0) { throw "Нет equipment units для smoke stage5" }

$type = $types | Select-Object -First 1
$unit = $units | Where-Object { $_.equipmentTypeId -eq $type.id } | Select-Object -First 1
if (-not $unit) { $unit = $units | Select-Object -First 1 }
Write-Host "USING type=$($type.name) unit=$($unit.name)"

# 1) Lead -> Application
$leadBody = @{
  contactName = 'Stage5 Flow Test'
  contactCompany = 'Stage5 LLC'
  contactPhone = '+7 (495) 700-10-10'
  source = 'manual'
} | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $leadBody
$leadId = $created.lead.id
Write-Host "LEAD id=$leadId"

$stageApp = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)
Write-Host "STAGE -> $($stageApp.stage)"

$apps = Invoke-RestMethod -Uri "$base/applications?scope=all&leadId=$leadId" -Headers $T
if (-not $apps.items -or $apps.items.Count -eq 0) { throw "Не создана заявка после lead->application" }
$appId = $apps.items[0].id
Write-Host "APP id=$appId"

# 2) Item + Reservation
$itemBody = @{
  equipmentTypeLabel = $type.name
  equipmentTypeId = $type.id
  quantity = 1
  shiftCount = 1
  readyForReservation = $true
  sourcingType = 'own'
} | ConvertTo-Json
$item = Invoke-RestMethod -Method Post -Uri "$base/applications/$appId/items" -Headers $T -ContentType 'application/json' -Body $itemBody
Write-Host "ITEM id=$($item.id)"

$start = (Get-Date).AddDays(2).ToString('s')
$end = (Get-Date).AddDays(2).AddHours(8).ToString('s')
$resBody = @{
  applicationItemId = $item.id
  sourcingType = 'own'
  equipmentTypeId = $type.id
  equipmentUnitId = $unit.id
  plannedStart = $start
  plannedEnd = $end
  internalStage = 'unit_defined'
} | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $resBody
Write-Host "RESERVATION id=$($res.id) stage=$($res.internalStage)"

# 3) Lead -> Reservation -> Departure (auto-create departure)
$stageRes = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='reservation'} | ConvertTo-Json)
Write-Host "STAGE -> $($stageRes.stage)"
$stageDep = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='departure'} | ConvertTo-Json)
Write-Host "STAGE -> $($stageDep.stage)"

$deps = Invoke-RestMethod -Uri "$base/departures?applicationId=$appId" -Headers $T
if (-not $deps.items -or $deps.items.Count -eq 0) { throw "Не создан departure при reservation->departure" }
$departureId = $deps.items[0].id
Write-Host "DEPARTURE id=$departureId status=$($deps.items[0].status)"

# 4) Departure lifecycle -> Completion
$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/start" -Headers $T -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/arrive" -Headers $T -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
$completedDeparture = Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/complete" -Headers $T -ContentType 'application/json' -Body (@{outcome='completed'; completionNote='smoke stage5'} | ConvertTo-Json)

$completion = $completedDeparture.completion
if (-not $completion -or -not $completion.id) { throw "Completion не создан после /departures/:id/complete" }
Write-Host "COMPLETION id=$($completion.id) outcome=$($completion.outcome)"

$completionList = Invoke-RestMethod -Uri "$base/completions?departureId=$departureId" -Headers $T
Write-Host "COMPLETIONS total=$($completionList.total)"

# 5) Stage terminal check
$lead = Invoke-RestMethod -Method Get -Uri "$base/leads/$leadId" -Headers $T
Write-Host "LEAD FINAL STAGE=$($lead.stage)"
if ($lead.stage -ne 'completed' -and $lead.stage -ne 'unqualified') {
  throw "Lead stage is expected to be terminal after completion flow"
}

try {
  Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='lead'} | ConvertTo-Json) | Out-Null
  throw "Terminal stage transition was unexpectedly allowed"
} catch {
  Write-Host "TERMINAL BLOCK OK"
}

# 6) Unqualified branch policy check: lead=unqualified, application=cancelled.
$lead2Body = @{
  contactName = 'Stage5 Unqualified Test'
  contactCompany = 'Stage5 UQ LLC'
  contactPhone = '+7 (495) 700-10-11'
  source = 'manual'
} | ConvertTo-Json
$created2 = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $lead2Body
$lead2Id = $created2.lead.id
$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$lead2Id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)

$apps2 = Invoke-RestMethod -Uri "$base/applications?scope=all&leadId=$lead2Id" -Headers $T
$app2Id = $apps2.items[0].id

$item2Body = @{
  equipmentTypeLabel = $type.name
  equipmentTypeId = $type.id
  quantity = 1
  shiftCount = 1
  readyForReservation = $true
  sourcingType = 'own'
} | ConvertTo-Json
$item2 = Invoke-RestMethod -Method Post -Uri "$base/applications/$app2Id/items" -Headers $T -ContentType 'application/json' -Body $item2Body

$start2 = (Get-Date).AddDays(3).ToString('s')
$end2 = (Get-Date).AddDays(3).AddHours(8).ToString('s')
$res2Body = @{
  applicationItemId = $item2.id
  sourcingType = 'own'
  equipmentTypeId = $type.id
  equipmentUnitId = $unit.id
  plannedStart = $start2
  plannedEnd = $end2
  internalStage = 'unit_defined'
} | ConvertTo-Json
$null = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $res2Body

$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$lead2Id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='reservation'} | ConvertTo-Json)
$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$lead2Id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='departure'} | ConvertTo-Json)

$deps2 = Invoke-RestMethod -Uri "$base/departures?applicationId=$app2Id" -Headers $T
$departure2Id = $deps2.items[0].id

$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departure2Id/start" -Headers $T -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departure2Id/arrive" -Headers $T -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
$null = Invoke-RestMethod -Method Post -Uri "$base/departures/$departure2Id/complete" -Headers $T -ContentType 'application/json' -Body (@{outcome='unqualified'; unqualifiedReason='smoke policy'} | ConvertTo-Json)

$lead2 = Invoke-RestMethod -Method Get -Uri "$base/leads/$lead2Id" -Headers $T
$app2 = Invoke-RestMethod -Method Get -Uri "$base/applications/$app2Id" -Headers $T

if ($lead2.stage -ne 'unqualified') {
  throw "Expected lead stage unqualified in unqualified completion flow, got $($lead2.stage)"
}
if ($app2.stage -ne 'cancelled') {
  throw "Expected application stage cancelled in unqualified completion flow, got $($app2.stage)"
}
if ($app2.isActive) {
  throw "Expected application inactive after unqualified completion flow"
}
Write-Host "UNQUALIFIED POLICY OK lead=unqualified application=cancelled"

Write-Host "=== STAGE 5 FLOW OK ==="
