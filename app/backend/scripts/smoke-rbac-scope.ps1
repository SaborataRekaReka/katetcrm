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

function Assert-StatsPayload {
  param(
    [Parameter(Mandatory = $true)]$Stats,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (-not $Stats -or -not $Stats.pipeline -or -not $Stats.operations -or -not $Stats.audit) {
    throw "$Label does not contain pipeline/operations/audit sections"
  }

  if ($null -eq $Stats.pipeline.total -or $null -eq $Stats.pipeline.active) {
    throw "$Label is missing pipeline total/active values"
  }
}

$adminLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$managerLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'manager@katet.local'; password = 'manager123' } | ConvertTo-Json)

$AT = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
$MT = @{ Authorization = "Bearer $($managerLogin.accessToken)" }

Write-Host "LOGIN OK admin=$($adminLogin.user.role) manager=$($managerLogin.user.role)"

# --- stats summary scope checks ---
$adminStats = Invoke-RestMethod -Method Get -Uri "$base/stats" -Headers $AT
$managerStats = Invoke-RestMethod -Method Get -Uri "$base/stats" -Headers $MT

Assert-StatsPayload -Stats $adminStats -Label 'Admin stats payload'
Assert-StatsPayload -Stats $managerStats -Label 'Manager stats payload'

$managerRows = @($managerStats.managers)
if ($managerRows.Count -gt 1) {
  throw "Manager stats must expose at most one manager row, got $($managerRows.Count)"
}
if ($managerRows.Count -eq 1 -and $managerRows[0].id -ne $managerLogin.user.id) {
  throw "Manager stats row id mismatch: expected $($managerLogin.user.id), got $($managerRows[0].id)"
}

if ($managerStats.pipeline.total -gt $adminStats.pipeline.total) {
  throw "Manager stats total must not exceed admin total: manager=$($managerStats.pipeline.total) admin=$($adminStats.pipeline.total)"
}

Write-Host "STATS SCOPE OK adminTotal=$($adminStats.pipeline.total) managerTotal=$($managerStats.pipeline.total)"

# --- reports slice checks ---
$adminReports = Invoke-RestMethod -Method Get -Uri "$base/stats/reports?periodDays=7" -Headers $AT
$managerReports = Invoke-RestMethod -Method Get -Uri "$base/stats/reports?periodDays=7" -Headers $MT

$adminReportItems = @($adminReports.items)
$managerReportItems = @($managerReports.items)

if ($adminReportItems.Count -lt 1) {
  throw 'Admin stats/reports returned no report rows'
}
if ($managerReportItems.Count -lt 1) {
  throw 'Manager stats/reports returned no report rows'
}

Write-Host "REPORTS SCOPE OK adminItems=$($adminReportItems.Count) managerItems=$($managerReportItems.Count)"

# --- analytics scope checks ---
$views = @('view-stale-leads', 'view-lost-leads', 'view-active-reservations', 'view-manager-load')
foreach ($viewId in $views) {
  $analytics = Invoke-RestMethod -Method Get -Uri "$base/stats/analytics?viewId=$viewId&sampleTake=6" -Headers $MT

  if (-not $analytics -or -not $analytics.summary -or $null -eq $analytics.managers -or $null -eq $analytics.samples) {
    throw "Manager stats/analytics payload is invalid for viewId=$viewId"
  }
  if ($analytics.viewId -ne $viewId) {
    throw "Manager stats/analytics viewId mismatch: expected=$viewId got=$($analytics.viewId)"
  }

  $analyticsManagers = @($analytics.managers)
  $analyticsSamples = @($analytics.samples)

  if ($analyticsManagers.Count -gt 1) {
    throw "Manager analytics must expose at most one manager row for viewId=$viewId, got $($analyticsManagers.Count)"
  }

  foreach ($row in $analyticsManagers) {
    if ($row.id -ne $managerLogin.user.id -and $row.id -ne 'unassigned') {
      throw "Manager analytics leaked foreign manager row id=$($row.id) for viewId=$viewId"
    }
  }

  if ($analyticsSamples.Count -gt 6) {
    throw "Manager analytics sampleTake=6 returned too many rows for viewId=$viewId"
  }

  Write-Host "ANALYTICS SCOPE($viewId) OK managers=$($analyticsManagers.Count) samples=$($analyticsSamples.Count)"
}

# --- analytics validation checks ---
Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/stats/analytics?viewId=view-manager-load&sampleTake=999" -Headers $MT
} -ExpectedStatuses @(400) -Label 'VALIDATION sampleTake upper-bound'

Assert-ExpectedHttpError -Request {
  Invoke-RestMethod -Method Get -Uri "$base/stats/analytics?viewId=invalid-view&sampleTake=6" -Headers $MT
} -ExpectedStatuses @(400) -Label 'VALIDATION analytics invalid viewId'

Write-Host '=== RBAC SCOPE SMOKE OK ==='