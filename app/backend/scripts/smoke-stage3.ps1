$ErrorActionPreference='Stop'
$base='http://localhost:3001/api/v1'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host "LOGIN OK"

# ---------- Directories ----------
$cats = Invoke-RestMethod -Uri "$base/equipment-categories" -Headers $T
Write-Host "CATS count=$($cats.Count)"
$types = Invoke-RestMethod -Uri "$base/equipment-types" -Headers $T
Write-Host "TYPES count=$($types.Count)"
$units = Invoke-RestMethod -Uri "$base/equipment-units" -Headers $T
Write-Host "UNITS count=$($units.Count)"
$subs = Invoke-RestMethod -Uri "$base/subcontractors" -Headers $T
Write-Host "SUBS count=$($subs.Count)"

$excavatorType = $types | Select-Object -First 1
$unit1 = $units | Where-Object { $_.equipmentTypeId -eq $excavatorType.id } | Select-Object -First 1
if (-not $unit1) { $unit1 = $units | Select-Object -First 1 }
$sub1 = $subs | Select-Object -First 1
Write-Host "USING type=$($excavatorType.name) unit=$($unit1.name) sub=$($sub1.name)"

# ---------- Fresh lead → application (to get clean app) ----------
$leadBody = @{ contactName='Stage3 Test'; contactCompany='Stage3 LLC'; contactPhone='+7 (495) 321-00-99'; source='manual' } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $leadBody
$leadId = $created.lead.id
Write-Host "LEAD id=$leadId"
$stage = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)
Write-Host "STAGE -> $($stage.stage)"

# ---------- Applications list / get ----------
$appsList = Invoke-RestMethod -Uri "$base/applications?scope=all&leadId=$leadId" -Headers $T
$appId = $appsList.items[0].id
$appNumber = $appsList.items[0].number
Write-Host "APP id=$appId number=$appNumber"

$app = Invoke-RestMethod -Uri "$base/applications/$appId" -Headers $T
Write-Host "APP FULL stage=$($app.stage) itemsCount=$($app.positions.Count) active=$($app.isActive)"

# ---------- Add items ----------
$item1Body = @{ equipmentTypeLabel=$excavatorType.name; equipmentTypeId=$excavatorType.id; quantity=1; shiftCount=2; pricePerShift=25000; deliveryPrice=5000 } | ConvertTo-Json
$item1 = Invoke-RestMethod -Method Post -Uri "$base/applications/$appId/items" -Headers $T -ContentType 'application/json' -Body $item1Body
Write-Host "ITEM1 id=$($item1.id) label=$($item1.equipmentTypeLabel)"

$item2Body = @{ equipmentTypeLabel='SecondItem'; quantity=1; shiftCount=1 } | ConvertTo-Json
$item2 = Invoke-RestMethod -Method Post -Uri "$base/applications/$appId/items" -Headers $T -ContentType 'application/json' -Body $item2Body
Write-Host "ITEM2 id=$($item2.id)"

# Update first item
$patchItem = Invoke-RestMethod -Method Patch -Uri "$base/application-items/$($item1.id)" -Headers $T -ContentType 'application/json' -Body (@{readyForReservation=$true; sourcingType='own'} | ConvertTo-Json)
Write-Host "ITEM1 updated ready=$($patchItem.readyForReservation) sourcing=$($patchItem.sourcingType)"

# ---------- Reservations ----------
$start = (Get-Date).AddDays(1).ToString("s")
$end = (Get-Date).AddDays(1).AddHours(8).ToString("s")
$resBody = @{ applicationItemId=$item1.id; sourcingType='own'; equipmentUnitId=$unit1.id; equipmentTypeId=$excavatorType.id; plannedStart=$start; plannedEnd=$end; internalStage='unit_defined' } | ConvertTo-Json
$res1 = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $resBody
Write-Host "RES1 id=$($res1.id) conflict=$($res1.hasConflict) stage=$($res1.internalStage)"

# Duplicate reservation on same item → should fail (partial unique)
try {
  Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $resBody | Out-Null
  Write-Host "DUP-RES FAIL - was accepted!"
} catch {
  Write-Host "DUP-RES blocked: $($_.ErrorDetails.Message)"
}

# Conflict warning: create second res on item2 using SAME unit+overlapping interval
$res2Body = @{ applicationItemId=$item2.id; sourcingType='own'; equipmentUnitId=$unit1.id; plannedStart=$start; plannedEnd=$end } | ConvertTo-Json
$res2 = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $res2Body
Write-Host "RES2 id=$($res2.id) conflict=$($res2.hasConflict) (expected True)"

# List reservations for app
$resList = Invoke-RestMethod -Uri "$base/reservations?applicationId=$appId" -Headers $T
Write-Host "RES LIST count=$($resList.total)"

# Release reservation
$rel = Invoke-RestMethod -Method Post -Uri "$base/reservations/$($res2.id)/release" -Headers $T -ContentType 'application/json' -Body (@{reason='test'} | ConvertTo-Json)
Write-Host "RELEASED status=$($rel.status) stage=$($rel.internalStage)"

# After release — new reservation on item2 allowed
$res3Body = @{ applicationItemId=$item2.id; sourcingType='subcontractor'; subcontractorId=$sub1.id; plannedStart=$start; plannedEnd=$end; subcontractorConfirmation='requested' } | ConvertTo-Json
$res3 = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body $res3Body
Write-Host "RES3 (after release) id=$($res3.id) sub=$($sub1.name)"

# ---------- Auto-release on lead→completed ----------
# Progress lead all the way to completed
foreach ($s in 'reservation','departure','completed') {
  $r = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $T -ContentType 'application/json' -Body (@{stage=$s} | ConvertTo-Json)
}
$appAfter = Invoke-RestMethod -Uri "$base/applications/$appId" -Headers $T
$activeRes = ($appAfter.positions | Where-Object { $_.status -eq 'reserved' -or $_.status -eq 'unit_selected' -or $_.status -eq 'conflict' }).Count
Write-Host "AFTER COMPLETED app.isActive=$($appAfter.isActive) activeRes=$activeRes (expected 0)"

# Deletion of item with active res should fail (create fresh lead for this)
$l2Body = @{ contactName='Del Test'; contactPhone='+7 (495) 100-00-01'; source='manual' } | ConvertTo-Json
$l2 = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $l2Body
$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$($l2.lead.id)/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)
$apps2 = Invoke-RestMethod -Uri "$base/applications?scope=all&leadId=$($l2.lead.id)" -Headers $T
$app2Id = $apps2.items[0].id
$delItemBody = @{ equipmentTypeLabel='ToDelete'; equipmentTypeId=$excavatorType.id } | ConvertTo-Json
$delItem = Invoke-RestMethod -Method Post -Uri "$base/applications/$app2Id/items" -Headers $T -ContentType 'application/json' -Body $delItemBody
$start2 = (Get-Date).AddDays(5).ToString("s")
$end2 = (Get-Date).AddDays(5).AddHours(4).ToString("s")
$delRes = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $T -ContentType 'application/json' -Body (@{applicationItemId=$delItem.id; sourcingType='own'; equipmentUnitId=$unit1.id; plannedStart=$start2; plannedEnd=$end2} | ConvertTo-Json)
try {
  Invoke-RestMethod -Method Delete -Uri "$base/application-items/$($delItem.id)" -Headers $T | Out-Null
  Write-Host "DELETE-WITH-RES FAIL"
} catch {
  Write-Host "DELETE-WITH-RES blocked OK"
}

Write-Host "=== STAGE 3 SMOKE OK ==="
