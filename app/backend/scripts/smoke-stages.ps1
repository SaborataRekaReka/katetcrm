$ErrorActionPreference='Stop'
$base='http://localhost:3001/api/v1'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
$id='cmoaegie8000t4tw31c2apvrh'
$s1 = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='reservation'} | ConvertTo-Json)
Write-Host "R1=$($s1.stage)"
$s2 = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='departure'} | ConvertTo-Json)
Write-Host "R2=$($s2.stage)"
$s3 = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='completed'} | ConvertTo-Json)
Write-Host "R3=$($s3.stage)"
try {
  Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='lead'} | ConvertTo-Json) | Out-Null
  Write-Host "BLOCK FAILED - transition accepted!"
} catch {
  Write-Host "BLOCK OK: $($_.ErrorDetails.Message)"
}
Write-Host "=== STAGE TEST OK ==="
