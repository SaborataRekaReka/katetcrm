$ErrorActionPreference='Stop'
$base='http://localhost:3001/api/v1'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }

# fresh lead for this run
$body = @{ contactName='Flow Test'; contactCompany='Flow LLC'; contactPhone='+7 (812) 999-88-77'; source='manual' } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body
$id = $created.lead.id
Write-Host "NEW LEAD id=$id stage=$($created.lead.stage)"

foreach ($s in 'application','reservation','departure','completed') {
  $r = Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage=$s} | ConvertTo-Json)
  Write-Host "  -> $($r.stage)"
}

try {
  Invoke-RestMethod -Method Post -Uri "$base/leads/$id/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='lead'} | ConvertTo-Json) | Out-Null
  Write-Host "BLOCK FAILED"
} catch {
  Write-Host "BLOCK OK (completed is terminal)"
}

$act = Invoke-RestMethod -Uri "$base/activity?entityType=lead&entityId=$id" -Headers $T
Write-Host "ACTIVITY count=$($act.Count)"

# unqualified branch
$body2 = @{ contactName='Unqual Test'; contactPhone='+7 (999) 000-11-22'; source='manual' } | ConvertTo-Json
$lead2 = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body2
$id2 = $lead2.lead.id
$r = Invoke-RestMethod -Method Post -Uri "$base/leads/$id2/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='unqualified'; reason='test reason'} | ConvertTo-Json)
Write-Host "UNQUAL flow: $($r.stage)"

Write-Host "=== FLOW OK ==="
