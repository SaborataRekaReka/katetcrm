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

$adminLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$managerLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'manager@katet.local'; password = 'manager123' } | ConvertTo-Json)

$AT = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
$MT = @{ Authorization = "Bearer $($managerLogin.accessToken)" }

Write-Host "LOGIN OK admin=$($adminLogin.user.role) manager=$($managerLogin.user.role)"

# --- RBAC guard checks for admin-only endpoints ---
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/settings/workspace" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager get workspace settings'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/users" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager list users'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/users/permissions-matrix" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager get permissions matrix'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Post -Uri "$base/users" -Headers $MT -ContentType 'application/json' -Body (@{
      email = "forbidden.$([Guid]::NewGuid().ToString('N').Substring(0, 8))@katet.local"
      fullName = 'Forbidden manager create'
      password = 'manager123'
      role = 'manager'
    } | ConvertTo-Json)
} -ExpectedStatuses @(403) -Label 'RBAC manager create user'

$runTag = [Guid]::NewGuid().ToString('N').Substring(0, 8)

# --- Settings read/write ---
$settings = Invoke-RestMethod -Method Get -Uri "$base/settings/workspace" -Headers $AT
if (-not $settings.sections -or $settings.sections.Count -eq 0) {
  throw 'Workspace settings are empty'
}

$section = $settings.sections[0]
if (-not $section.id) {
  throw 'Workspace section id is missing'
}
if (-not $section.rows -or $section.rows.Count -eq 0) {
  throw 'Workspace section has no editable rows'
}

$nextRows = @()
for ($i = 0; $i -lt $section.rows.Count; $i++) {
  $row = $section.rows[$i]
  if ($i -eq 0) {
    $nextRows += @{ label = $row.label; value = "smoke-admin-$runTag" }
  } else {
    $nextRows += @{ label = $row.label; value = $row.value }
  }
}

$updatedSection = Invoke-RestMethod -Method Patch -Uri "$base/settings/workspace/sections/$($section.id)" -Headers $AT -ContentType 'application/json' -Body (@{ rows = $nextRows } | ConvertTo-Json -Depth 10)
if (-not $updatedSection.rows -or $updatedSection.rows.Count -eq 0 -or $updatedSection.rows[0].value -ne "smoke-admin-$runTag") {
  throw 'Workspace settings update did not persist expected row value'
}
Write-Host "SETTINGS UPDATE OK section=$($section.id)"

# --- Users create/update ---
$email = "smoke.admin.$runTag@katet.local"
$createdUser = Invoke-RestMethod -Method Post -Uri "$base/users" -Headers $AT -ContentType 'application/json' -Body (@{
    email = $email
    fullName = "Smoke Admin User $runTag"
    password = 'manager123'
    role = 'manager'
    isActive = $true
  } | ConvertTo-Json)

if (-not $createdUser.id) {
  throw 'Admin user create returned empty id'
}

$updatedUser = Invoke-RestMethod -Method Patch -Uri "$base/users/$($createdUser.id)" -Headers $AT -ContentType 'application/json' -Body (@{
    fullName = "Smoke Admin Updated $runTag"
    isActive = $false
  } | ConvertTo-Json)

if ($updatedUser.fullName -ne "Smoke Admin Updated $runTag" -or $updatedUser.isActive -ne $false) {
  throw 'Admin user update returned unexpected payload'
}
Write-Host "USERS UPDATE OK id=$($createdUser.id)"

# --- Permissions matrix update + rollback ---
$matrix = Invoke-RestMethod -Method Get -Uri "$base/users/permissions-matrix" -Headers $AT
if (-not $matrix.capabilities -or $matrix.capabilities.Count -eq 0) {
  throw 'Permissions matrix is empty'
}

$capability = $matrix.capabilities | Where-Object { $_.id -eq 'admin.imports' } | Select-Object -First 1
if (-not $capability) {
  $capability = $matrix.capabilities[0]
}

$originalManager = [bool]$capability.matrix.manager
$toggledManager = -not $originalManager

$changedCapability = Invoke-RestMethod -Method Patch -Uri "$base/users/permissions-matrix/$($capability.id)" -Headers $AT -ContentType 'application/json' -Body (@{ manager = $toggledManager } | ConvertTo-Json)
if ([bool]$changedCapability.matrix.manager -ne $toggledManager) {
  throw 'Permissions matrix update did not change manager flag as expected'
}

$restoredCapability = Invoke-RestMethod -Method Patch -Uri "$base/users/permissions-matrix/$($capability.id)" -Headers $AT -ContentType 'application/json' -Body (@{ manager = $originalManager } | ConvertTo-Json)
if ([bool]$restoredCapability.matrix.manager -ne $originalManager) {
  throw 'Permissions matrix rollback did not restore manager flag'
}
Write-Host "PERMISSIONS UPDATE OK capability=$($capability.id)"

# --- Audit checks for settings/permissions entries ---
$settingsAudit = Invoke-RestMethod -Method Get -Uri "$base/activity/search?module=admin&entityType=settings&entityId=$($section.id)&action=updated&take=50" -Headers $AT
if (-not $settingsAudit.items -or $settingsAudit.items.Count -eq 0) {
  throw 'Settings admin update was not found in activity search'
}

$settingsActorMatch = $settingsAudit.items | Where-Object { $_.actor -and $_.actor.id -eq $adminLogin.user.id } | Select-Object -First 1
if (-not $settingsActorMatch) {
  throw 'Settings activity entry does not contain admin actor linkage'
}

$permissionsAudit = Invoke-RestMethod -Method Get -Uri "$base/activity/search?module=admin&entityType=permissions&entityId=$($capability.id)&action=updated&take=50" -Headers $AT
if (-not $permissionsAudit.items -or $permissionsAudit.items.Count -eq 0) {
  throw 'Permissions admin update was not found in activity search'
}

$permissionsActorMatch = $permissionsAudit.items | Where-Object { $_.actor -and $_.actor.id -eq $adminLogin.user.id } | Select-Object -First 1
if (-not $permissionsActorMatch) {
  throw 'Permissions activity entry does not contain admin actor linkage'
}

Write-Host '=== ADMIN WRITE/AUDIT SMOKE OK ==='