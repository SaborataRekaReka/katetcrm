param(
  [switch]$StopOnFailure
)

$ErrorActionPreference = 'Stop'

$steps = @(
  @{ Name = 'backend:typecheck'; Command = { pnpm run typecheck } },
  @{ Name = 'backend:build'; Command = { pnpm run build } },
  @{ Name = 'frontend:build'; Command = { pnpm --dir ..\frontend run build } },
  @{ Name = 'frontend:check:ui-consistency'; Command = { pnpm --dir ..\frontend run check:ui-consistency } },
  @{ Name = 'backend:smoke:release'; Command = { pnpm run smoke:release } },
  @{ Name = 'frontend:e2e'; Command = { pnpm --dir ..\frontend run e2e } }
)

$results = @()
$hasFailures = $false

foreach ($step in $steps) {
  Write-Host "=== RUN $($step.Name) ==="
  $startedAt = Get-Date
  $status = 'PASS'
  $details = ''

  try {
    & $step.Command
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "Exited with code $exitCode"
    }
  }
  catch {
    $status = 'FAIL'
    $hasFailures = $true
    $details = $_.Exception.Message
    Write-Host "FAILED: $($step.Name)"
    Write-Host "  $details"

    if ($StopOnFailure) {
      $durationSeconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
      $results += [pscustomobject]@{
        Step = $step.Name
        Status = $status
        DurationSec = $durationSeconds
        Details = $details
      }
      break
    }
  }

  $durationSeconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
  $results += [pscustomobject]@{
    Step = $step.Name
    Status = $status
    DurationSec = $durationSeconds
    Details = $details
  }
}

Write-Host '=== TEST SUMMARY ==='
$results | Format-Table -AutoSize

if ($hasFailures) {
  throw 'ALL TESTS FAILED: see summary above.'
}

Write-Host '=== ALL TESTS OK ==='
