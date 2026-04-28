param(
  [ValidateRange(1, 50)]
  [int]$Iterations = 3
)

$ErrorActionPreference = 'Stop'

$flowScript = Join-Path $PSScriptRoot 'smoke-flow.ps1'
if (-not (Test-Path $flowScript)) {
  throw "smoke-flow script was not found: $flowScript"
}

for ($i = 1; $i -le $Iterations; $i++) {
  Write-Host "=== FLOW ITERATION $i/$Iterations ==="
  & $flowScript
}

Write-Host "=== FLOW REPEAT OK ($Iterations iterations) ==="
