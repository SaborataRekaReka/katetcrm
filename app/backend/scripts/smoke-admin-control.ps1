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

# --- Control runtime reads (admin) ---
$stats = Invoke-RestMethod -Method Get -Uri "$base/stats" -Headers $AT
if (-not $stats -or -not $stats.pipeline -or -not $stats.operations -or -not $stats.audit) {
  throw 'Control stats payload is missing required sections'
}

$reports = Invoke-RestMethod -Method Get -Uri "$base/stats/reports?periodDays=7" -Headers $AT
if (-not $reports.items) {
  throw 'Control reports payload does not contain items'
}

$analyticsViews = @('view-stale-leads', 'view-lost-leads', 'view-active-reservations', 'view-manager-load')
foreach ($viewId in $analyticsViews) {
  $analytics = Invoke-RestMethod -Method Get -Uri "$base/stats/analytics?viewId=$viewId&sampleTake=6" -Headers $AT
  if (-not $analytics -or $analytics.viewId -ne $viewId -or -not $analytics.summary) {
    throw "Control analytics payload is invalid for viewId=$viewId"
  }
  if ($null -eq $analytics.managers -or $null -eq $analytics.samples) {
    throw "Control analytics payload is missing managers/samples for viewId=$viewId"
  }
}

$auditSales = Invoke-RestMethod -Method Get -Uri "$base/activity/search?module=sales&take=5" -Headers $AT
if ($null -eq $auditSales.total -or $null -eq $auditSales.items) {
  throw 'Control audit payload is invalid for module=sales'
}

Write-Host "CONTROL READ OK reports=$($reports.items.Count) auditRows=$($auditSales.items.Count)"

# --- Admin runtime reads (admin) ---
$users = Invoke-RestMethod -Method Get -Uri "$base/users" -Headers $AT
if ($null -eq $users.total -or $null -eq $users.items) {
  throw 'Admin users payload is invalid'
}

$settings = Invoke-RestMethod -Method Get -Uri "$base/settings/workspace" -Headers $AT
if (-not $settings.sections -or $settings.sections.Count -eq 0) {
  throw 'Admin settings payload is empty'
}

$integrations = Invoke-RestMethod -Method Get -Uri "$base/integrations/events?take=5" -Headers $AT
if ($null -eq $integrations.total -or $null -eq $integrations.items) {
  throw 'Admin integrations payload is invalid'
}

Write-Host "ADMIN READ OK users=$($users.total) sections=$($settings.sections.Count) integrations=$($integrations.total)"

# --- Manager must be denied on admin runtime endpoints ---
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/users" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager list users'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/settings/workspace" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager get workspace settings'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/integrations/events?take=1" -Headers $MT
} -ExpectedStatuses @(403) -Label 'RBAC manager list integration events'

Write-Host '=== ADMIN/CONTROL RUNTIME SMOKE OK ==='