$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host "LOGIN OK"

$body = @{ contactName='Stages Test'; contactCompany='Stages LLC'; contactPhone='+7 (495) 500-11-22'; source='manual' } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body
$id = $created.lead.id
Write-Host "LEAD id=$id stage=$($created.lead.stage)"

foreach ($s in 'application','reservation','departure','completed') {
  $r = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage=$s} | ConvertTo-Json)
  Write-Host "  -> $($r.stage)"
}

try {
  Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='lead'} | ConvertTo-Json) | Out-Null
  Write-Host "BLOCK FAILED - transition accepted"
} catch {
  Write-Host "BLOCK OK (completed is terminal)"
}

Write-Host "=== STAGE TEST OK ==="
