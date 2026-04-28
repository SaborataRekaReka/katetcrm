$ErrorActionPreference = 'Stop'

$steps = @('smoke:base', 'smoke:stage3', 'smoke:stage5', 'smoke:stage6', 'smoke:stage7', 'smoke:tasks', 'smoke:rbac', 'smoke:rbac:scope', 'smoke:admin', 'smoke:admin:control')

foreach ($step in $steps) {
  Write-Host "=== RUN $step ==="
  pnpm run $step
  if ($LASTEXITCODE -ne 0) {
    throw "$step failed with exit code $LASTEXITCODE"
  }
}

$frontendStep = 'check:ui-consistency'
Write-Host "=== RUN frontend:$frontendStep ==="
pnpm --dir ..\frontend run $frontendStep
if ($LASTEXITCODE -ne 0) {
  throw "frontend:$frontendStep failed with exit code $LASTEXITCODE"
}

Write-Host '=== RELEASE GATE OK ==='
