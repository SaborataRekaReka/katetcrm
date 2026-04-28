$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

function Get-HttpStatusCode {
  param([System.Management.Automation.ErrorRecord]$ErrorRecord)

  if ($ErrorRecord.Exception -and $ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.StatusCode) {
    return [int]$ErrorRecord.Exception.Response.StatusCode
  }
  return $null
}

function Assert-ExpectedHttpError {
  param(
    [scriptblock]$Request,
    [int[]]$ExpectedStatuses,
    [string]$Label
  )

  try {
    & $Request | Out-Null
    throw "$Label unexpectedly succeeded"
  } catch {
    $status = Get-HttpStatusCode $_
    if ($null -eq $status) {
      throw
    }
    if ($ExpectedStatuses -notcontains $status) {
      throw "Expected one of [$($ExpectedStatuses -join ', ')] for $Label, got $status"
    }
    Write-Host "$Label blocked ($status)"
  }
}

$adminLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$managerLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='manager@katet.local';password='manager123'} | ConvertTo-Json)

$AT = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
$MT = @{ Authorization = "Bearer $($managerLogin.accessToken)" }

Write-Host "LOGIN OK admin=$($adminLogin.user.role) manager=$($managerLogin.user.role)"

# ---------- Admin-only directories matrix ----------

$categoryName = "RBAC Smoke " + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$createCategoryBody = @{ name = $categoryName } | ConvertTo-Json

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Post -Uri "$base/equipment-categories" -Headers $MT -ContentType 'application/json' -Body $createCategoryBody
} -ExpectedStatuses @(403) -Label 'RBAC manager create category'

$createdCategory = Invoke-RestMethod -Method Post -Uri "$base/equipment-categories" -Headers $AT -ContentType 'application/json' -Body $createCategoryBody
if (-not $createdCategory.id) {
  throw 'Admin category creation returned empty id'
}
Write-Host "RBAC admin create category OK id=$($createdCategory.id)"

$patchBody = @{ name = "$categoryName updated" } | ConvertTo-Json
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Patch -Uri "$base/equipment-categories/$($createdCategory.id)" -Headers $MT -ContentType 'application/json' -Body $patchBody
} -ExpectedStatuses @(403) -Label 'RBAC manager update category'

$typeName = "RBAC Type " + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$typeCreateBody = @{ name = $typeName; categoryId = $createdCategory.id } | ConvertTo-Json

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Post -Uri "$base/equipment-types" -Headers $MT -ContentType 'application/json' -Body $typeCreateBody
} -ExpectedStatuses @(403) -Label 'RBAC manager create equipment type'

$createdType = Invoke-RestMethod -Method Post -Uri "$base/equipment-types" -Headers $AT -ContentType 'application/json' -Body $typeCreateBody
if (-not $createdType.id) {
  throw 'Admin equipment type creation returned empty id'
}

$typePatchBody = @{ name = "$typeName updated" } | ConvertTo-Json
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Patch -Uri "$base/equipment-types/$($createdType.id)" -Headers $MT -ContentType 'application/json' -Body $typePatchBody
} -ExpectedStatuses @(403) -Label 'RBAC manager update equipment type'

$updatedType = Invoke-RestMethod -Method Patch -Uri "$base/equipment-types/$($createdType.id)" -Headers $AT -ContentType 'application/json' -Body $typePatchBody
Write-Host "RBAC admin update equipment type OK id=$($updatedType.id)"

$unitName = "RBAC Unit " + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$unitCreateBody = @{ name = $unitName; equipmentTypeId = $createdType.id } | ConvertTo-Json

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Post -Uri "$base/equipment-units" -Headers $MT -ContentType 'application/json' -Body $unitCreateBody
} -ExpectedStatuses @(403) -Label 'RBAC manager create equipment unit'

$createdUnit = Invoke-RestMethod -Method Post -Uri "$base/equipment-units" -Headers $AT -ContentType 'application/json' -Body $unitCreateBody
if (-not $createdUnit.id) {
  throw 'Admin equipment unit creation returned empty id'
}

$unitPatchBody = @{ notes = 'rbac smoke update' } | ConvertTo-Json
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Patch -Uri "$base/equipment-units/$($createdUnit.id)" -Headers $MT -ContentType 'application/json' -Body $unitPatchBody
} -ExpectedStatuses @(403) -Label 'RBAC manager update equipment unit'

$updatedUnit = Invoke-RestMethod -Method Patch -Uri "$base/equipment-units/$($createdUnit.id)" -Headers $AT -ContentType 'application/json' -Body $unitPatchBody
Write-Host "RBAC admin update equipment unit OK id=$($updatedUnit.id)"

$subName = "RBAC Sub " + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$subCreateBody = @{ name = $subName; contactPhone = '+7 (495) 900-00-01' } | ConvertTo-Json

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Post -Uri "$base/subcontractors" -Headers $MT -ContentType 'application/json' -Body $subCreateBody
} -ExpectedStatuses @(403) -Label 'RBAC manager create subcontractor'

$createdSub = Invoke-RestMethod -Method Post -Uri "$base/subcontractors" -Headers $AT -ContentType 'application/json' -Body $subCreateBody
if (-not $createdSub.id) {
  throw 'Admin subcontractor creation returned empty id'
}

$subPatchBody = @{ notes = 'rbac smoke update' } | ConvertTo-Json
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Patch -Uri "$base/subcontractors/$($createdSub.id)" -Headers $MT -ContentType 'application/json' -Body $subPatchBody
} -ExpectedStatuses @(403) -Label 'RBAC manager update subcontractor'

$updatedSub = Invoke-RestMethod -Method Patch -Uri "$base/subcontractors/$($createdSub.id)" -Headers $AT -ContentType 'application/json' -Body $subPatchBody
Write-Host "RBAC admin update subcontractor OK id=$($updatedSub.id)"

# ---------- Manager ownership matrix (sales/ops flows) ----------

$leadBody = @{
  contactName = 'RBAC Ownership Test'
  contactCompany = 'RBAC LLC'
  contactPhone = '+7 (495) 901-00-02'
  source = 'manual'
} | ConvertTo-Json

$createdLead = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $AT -ContentType 'application/json' -Body $leadBody
$leadId = $createdLead.lead.id
if (-not $leadId) {
  throw 'Admin lead creation returned empty id'
}

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/leads/$leadId" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager get foreign lead'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Patch -Uri "$base/leads/$leadId" -Headers $MT -ContentType 'application/json' -Body (@{ comment = 'should fail' } | ConvertTo-Json)
} -ExpectedStatuses @(403) -Label 'RBAC manager update foreign lead'

$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $AT -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)
$apps = Invoke-RestMethod -Method Get -Uri "$base/applications?scope=all&leadId=$leadId" -Headers $AT
if (-not $apps.items -or $apps.items.Count -eq 0) {
  throw 'Application was not created for RBAC ownership test lead'
}
$appId = $apps.items[0].id

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/applications/$appId" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager get foreign application'

$itemBody = @{
  equipmentTypeLabel = $updatedType.name
  equipmentTypeId = $updatedType.id
  quantity = 1
  shiftCount = 1
  sourcingType = 'own'
  readyForReservation = $true
} | ConvertTo-Json

$item = Invoke-RestMethod -Method Post -Uri "$base/applications/$appId/items" -Headers $AT -ContentType 'application/json' -Body $itemBody
if (-not $item.id) {
  throw 'Application item was not created in RBAC ownership flow'
}

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Patch -Uri "$base/application-items/$($item.id)" -Headers $MT -ContentType 'application/json' -Body (@{ comment = 'should fail' } | ConvertTo-Json)
} -ExpectedStatuses @(403) -Label 'RBAC manager update foreign application item'

$start = (Get-Date).AddDays(3).ToString('s')
$end = (Get-Date).AddDays(3).AddHours(8).ToString('s')
$reservationBody = @{
  applicationItemId = $item.id
  sourcingType = 'own'
  equipmentTypeId = $updatedType.id
  equipmentUnitId = $updatedUnit.id
  plannedStart = $start
  plannedEnd = $end
  internalStage = 'unit_defined'
} | ConvertTo-Json

$reservation = Invoke-RestMethod -Method Post -Uri "$base/reservations" -Headers $AT -ContentType 'application/json' -Body $reservationBody
if (-not $reservation.id) {
  throw 'Reservation was not created in RBAC ownership flow'
}

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/reservations/$($reservation.id)" -Headers $MT
} -ExpectedStatuses @(404) -Label 'RBAC manager get foreign reservation'

$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $AT -ContentType 'application/json' -Body (@{stage='reservation'} | ConvertTo-Json)
$null = Invoke-RestMethod -Method Post -Uri "$base/leads/$leadId/stage" -Headers $AT -ContentType 'application/json' -Body (@{stage='departure'} | ConvertTo-Json)

$departures = Invoke-RestMethod -Method Get -Uri "$base/departures?applicationId=$appId" -Headers $AT
if (-not $departures.items -or $departures.items.Count -eq 0) {
  throw 'Departure was not created in RBAC ownership flow'
}
$departureId = $departures.items[0].id

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/departures/$departureId" -Headers $MT
} -ExpectedStatuses @(404) -Label 'RBAC manager get foreign departure'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Post -Uri "$base/departures/$departureId/start" -Headers $MT -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
} -ExpectedStatuses @(404) -Label 'RBAC manager start foreign departure'

Write-Host "=== RBAC SMOKE OK ==="
