$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@katet.local';password='admin123'} | ConvertTo-Json)
Write-Host "LOGIN OK role=$($login.user.role)"
$T = @{ Authorization = "Bearer $($login.accessToken)" }

$body1 = @{ contactName='Ivan Test'; contactCompany='OOO Romashka'; contactPhone='+7 (495) 111-22-33'; source='manual'; equipmentTypeHint='Excavator' } | ConvertTo-Json
$c1 = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body1
Write-Host "LEAD1 id=$($c1.lead.id) stage=$($c1.lead.stage) isDuplicate=$($c1.lead.isDuplicate) dupsFound=$($c1.duplicates.Count)"

$body2 = @{ contactName='Ivan Test 2'; contactCompany='OOO Romashka'; contactPhone='8 495 111 22 33'; source='site' } | ConvertTo-Json
$c2 = Invoke-RestMethod -Method Post -Uri "$base/leads" -Headers $T -ContentType 'application/json' -Body $body2
Write-Host "LEAD2 id=$($c2.lead.id) isDuplicate=$($c2.lead.isDuplicate) dupsFound=$($c2.duplicates.Count)"

$stage = Invoke-RestMethod -Method Post -Uri "$base/leads/$($c1.lead.id)/stage" -Headers $T -ContentType 'application/json' -Body (@{stage='application'} | ConvertTo-Json)
Write-Host "STAGE lead1 -> $($stage.stage)"

$list = Invoke-RestMethod -Uri "$base/leads?scope=all" -Headers $T
$stages = ($list.items | ForEach-Object { $_.stage }) -join ','
Write-Host "LEADS total=$($list.total) stages=$stages"

$act = Invoke-RestMethod -Uri "$base/activity?entityType=lead&entityId=$($c1.lead.id)" -Headers $T
$actions = ($act | ForEach-Object { $_.action }) -join ','
Write-Host "ACTIVITY lead1 count=$($act.Count) actions=$actions"

$dups = Invoke-RestMethod -Uri "$base/leads/duplicates?phone=+74951112233" -Headers $T
Write-Host "DUPLICATES-BY-PHONE count=$($dups.Count)"

$mgrLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='manager@katet.local';password='manager123'} | ConvertTo-Json)
$MT = @{ Authorization = "Bearer $($mgrLogin.accessToken)" }
$mgrList = Invoke-RestMethod -Uri "$base/leads" -Headers $MT
Write-Host "MANAGER SCOPE mine count=$($mgrList.total)"

Write-Host "=== SMOKE OK ==="
