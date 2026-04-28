$ErrorActionPreference = 'Stop'

$DbPort = 5433
$DbContainerName = 'katet-crm-db'

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Write-Host "==> $Label"
  & cmd /c $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step '$Label' failed with exit code $LASTEXITCODE"
  }
}

function Get-ListeningProcessLabel {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $conn) {
    return $null
  }

  $processId = $conn.OwningProcess
  $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($proc) {
    return "$($proc.ProcessName) (pid $processId)"
  }
  return "pid $processId"
}

function Test-ContainerRunning {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $out = (& cmd /c "docker ps --filter \"name=^/$Name$\" --format \"{{.Names}}\" 2>&1" | Out-String).Trim()
  return $out -eq $Name
}

Write-Host '==> Starting PostgreSQL container (if needed)'
$portListener = Get-ListeningProcessLabel -Port $DbPort
$containerRunning = Test-ContainerRunning -Name $DbContainerName
$skipComposeStart = $false

if ($portListener -and -not $containerRunning) {
  Write-Host "Port $DbPort is already in use by $portListener."
  Write-Host 'Skipping docker compose start and attempting to use the existing PostgreSQL instance from DATABASE_URL.'
  $skipComposeStart = $true
}

try {
  if (-not $skipComposeStart) {
    $composeOutput = (& cmd /c "docker compose -f docker-compose.yml up -d 2>&1" | Out-String)
    $composeExit = $LASTEXITCODE
    if ($composeOutput) {
      Write-Host $composeOutput.TrimEnd()
    }
    if ($composeExit -ne 0) {
      if ($composeOutput -match 'port is already allocated|Only one usage of each socket address') {
        Write-Host "Port $DbPort already allocated. Continue with existing PostgreSQL instance from DATABASE_URL."
      } else {
        throw "docker compose up -d failed: $composeOutput"
      }
    }
  }
} catch {
  throw
}

try {
  Invoke-Step -Command 'pnpm run prisma:deploy' -Label 'Apply migrations'
} catch {
  $msg = $_.ToString()
  if ($msg -match 'P1000|Authentication failed') {
    Write-Host ''
    Write-Host 'DATABASE AUTH ERROR (P1000).'
    Write-Host "Check app/backend/.env DATABASE_URL and credentials of the DB on localhost:$DbPort."
    Write-Host 'If an old container uses a different password, update DATABASE_URL or intentionally recreate container+volume.'
  } elseif ($msg -match "P1001|P1002|Can't reach database server|ECONNREFUSED") {
    Write-Host ''
    Write-Host 'DATABASE CONNECTIVITY ERROR (P1001/P1002).'
    Write-Host "Port $DbPort is unavailable for Prisma connection or DATABASE_URL points to an unreachable DB."
    Write-Host 'Fallback runbook:'
    Write-Host '  1) Verify listener: Get-NetTCPConnection -LocalPort 5433 -State Listen'
    Write-Host '  2) If another local Postgres should be used, align DATABASE_URL user/password/dbname to that instance'
    Write-Host '  3) If container DB is expected, stop conflicting process and rerun prepare:dev'
  }
  throw
}

try {
  Invoke-Step -Command 'pnpm run prisma:generate' -Label 'Generate Prisma client'
} catch {
  $msg = $_.ToString()
  if ($msg -match 'EPERM|query_engine-windows.dll.node') {
    Write-Host ''
    Write-Host 'PRISMA GENERATE ERROR (Windows EPERM on query_engine).'
    Write-Host 'Likely another Node/Nest process keeps Prisma engine DLL locked.'
    Write-Host 'Stop running backend/dev Node processes and rerun prepare:dev.'
  }
  throw
}
Invoke-Step -Command 'pnpm run seed' -Label 'Seed database'

Write-Host '=== PREPARE DEV OK ==='
