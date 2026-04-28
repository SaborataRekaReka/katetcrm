$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$adminLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$managerLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'manager@katet.local'; password = 'manager123' } | ConvertTo-Json)

$AT = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
$MT = @{ Authorization = "Bearer $($managerLogin.accessToken)" }

Write-Host "LOGIN OK admin=$($adminLogin.user.role) manager=$($managerLogin.user.role)"

$runTag = [Guid]::NewGuid().ToString('N').Substring(0, 8)

$created = Invoke-RestMethod -Method Post -Uri "$base/tasks" -Headers $MT -ContentType 'application/json' -Body (@{
    title = "Smoke Task $runTag"
    priority = 'normal'
    tags = @('smoke')
  } | ConvertTo-Json -Depth 10)

if (-not $created.id) {
  throw 'Task create did not return id'
}
if ($created.status -ne 'open') {
  throw "Task create returned unexpected status=$($created.status)"
}
Write-Host "CREATE OK id=$($created.id)"

$forcedAssigneeCreate = Invoke-RestMethod -Method Post -Uri "$base/tasks" -Headers $MT -ContentType 'application/json' -Body (@{
    title = "Smoke Force Assignee $runTag"
    assigneeId = $adminLogin.user.id
    priority = 'high'
  } | ConvertTo-Json -Depth 10)

if ($forcedAssigneeCreate.assignee -ne $managerLogin.user.fullName) {
  throw 'Manager task create must stay self-assigned even if assigneeId is provided'
}
Write-Host "MANAGER ASSIGNEE GUARD OK id=$($forcedAssigneeCreate.id)"

$mine = Invoke-RestMethod -Method Get -Uri "$base/tasks?scope=mine&take=200" -Headers $MT
$mineIds = @($mine.items | ForEach-Object { $_.id })
if ($mineIds -notcontains $created.id) {
  throw 'Created task is missing from manager scope list'
}
Write-Host "LIST(mine) OK total=$($mine.total)"

$inProgress = Invoke-RestMethod -Method Post -Uri "$base/tasks/$($created.id)/status" -Headers $MT -ContentType 'application/json' -Body (@{ status = 'in_progress' } | ConvertTo-Json)
if ($inProgress.status -ne 'in_progress') {
  throw "Status update failed, got $($inProgress.status)"
}
Write-Host 'STATUS UPDATE OK'

$withDueDate = Invoke-RestMethod -Method Patch -Uri "$base/tasks/$($created.id)" -Headers $MT -ContentType 'application/json' -Body (@{ dueDate = '2030-01-01T10:00:00.000Z' } | ConvertTo-Json)
if (-not $withDueDate.dueDate) {
  throw 'Task dueDate update did not persist value'
}
Write-Host "DUE DATE SET OK dueDate=$($withDueDate.dueDate)"

$withoutDueDate = Invoke-RestMethod -Method Patch -Uri "$base/tasks/$($created.id)" -Headers $MT -ContentType 'application/json' -Body (@{ dueDate = $null } | ConvertTo-Json)
if ($null -ne $withoutDueDate.dueDate) {
  throw 'Task dueDate clear did not set dueDate to null'
}
Write-Host 'DUE DATE CLEAR OK'

$withSubtask = Invoke-RestMethod -Method Post -Uri "$base/tasks/$($created.id)/subtasks" -Headers $MT -ContentType 'application/json' -Body (@{ title = 'Smoke subtask' } | ConvertTo-Json)
if (-not $withSubtask.subtasks -or $withSubtask.subtasks.Count -lt 1) {
  throw 'Subtask was not added'
}
Write-Host "SUBTASK OK count=$($withSubtask.subtasks.Count)"

$duplicate = Invoke-RestMethod -Method Post -Uri "$base/tasks/$($created.id)/duplicate" -Headers $MT
if (-not $duplicate.id -or $duplicate.id -eq $created.id) {
  throw 'Duplicate endpoint did not create a distinct task'
}
if ($duplicate.status -ne 'open') {
  throw "Duplicate must be open, got $($duplicate.status)"
}
Write-Host "DUPLICATE OK id=$($duplicate.id)"

$archived = Invoke-RestMethod -Method Post -Uri "$base/tasks/$($created.id)/archive" -Headers $MT
if ($archived.id -ne $created.id) {
  throw 'Archive endpoint returned wrong task'
}
Write-Host 'ARCHIVE OK'

$mineAfterArchive = Invoke-RestMethod -Method Get -Uri "$base/tasks?scope=mine&take=200" -Headers $MT
$mineAfterIds = @($mineAfterArchive.items | ForEach-Object { $_.id })
if ($mineAfterIds -contains $created.id) {
  throw 'Archived task must be hidden from default scope list'
}
Write-Host 'ARCHIVE FILTER OK'

$mineWithArchived = Invoke-RestMethod -Method Get -Uri "$base/tasks?scope=mine&includeArchived=true&take=200" -Headers $MT
$mineWithArchivedIds = @($mineWithArchived.items | ForEach-Object { $_.id })
if ($mineWithArchivedIds -notcontains $created.id) {
  throw 'Archived task is missing when includeArchived=true'
}
Write-Host 'ARCHIVE INCLUDE OK'

$adminAll = Invoke-RestMethod -Method Get -Uri "$base/tasks?scope=all&take=200" -Headers $AT
if ($adminAll.total -lt 1) {
  throw 'Admin scope all returned no tasks'
}
Write-Host "ADMIN SCOPE(all) OK total=$($adminAll.total)"

Write-Host '=== TASKS SMOKE OK ==='
