param(
  [switch]$StrictProfile
)

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'

$script:DotEnvLoaded = $false
$script:DotEnvMap = @{}

function Load-DotEnv {
  if ($script:DotEnvLoaded) {
    return
  }

  $script:DotEnvLoaded = $true
  $envPath = Join-Path $PSScriptRoot '..\.env'
  if (-not (Test-Path $envPath)) {
    return
  }

  foreach ($rawLine in Get-Content -Path $envPath) {
    $line = $rawLine.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
      continue
    }

    $eq = $line.IndexOf('=')
    if ($eq -lt 1) {
      continue
    }

    $key = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not $script:DotEnvMap.ContainsKey($key)) {
      $script:DotEnvMap[$key] = $value
    }
  }
}

function Get-ConfigValue {
  param([Parameter(Mandatory = $true)][string]$Key)

  $fromProcess = [Environment]::GetEnvironmentVariable($Key)
  if (-not [string]::IsNullOrWhiteSpace($fromProcess)) {
    return $fromProcess.Trim()
  }

  Load-DotEnv
  if ($script:DotEnvMap.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace($script:DotEnvMap[$Key])) {
    return [string]$script:DotEnvMap[$Key]
  }

  return $null
}

function ConvertTo-StableJson {
  param([Parameter(Mandatory = $true)][AllowNull()]$Value)

  if ($null -eq $Value) {
    return 'null'
  }

  if ($Value -is [string]) {
    return (ConvertTo-Json $Value -Compress)
  }

  if ($Value -is [bool]) {
    if ($Value) {
      return 'true'
    }
    return 'false'
  }

  if ($Value -is [DateTime]) {
    return (ConvertTo-Json ($Value.ToString('o')) -Compress)
  }

  if ($Value -is [System.Collections.IDictionary]) {
    $keys = @($Value.Keys | ForEach-Object { [string]$_ } | Sort-Object)
    $parts = @()
    foreach ($key in $keys) {
      $parts += ((ConvertTo-Json $key -Compress) + ':' + (ConvertTo-StableJson $Value[$key]))
    }
    return '{' + ($parts -join ',') + '}'
  }

  if ($Value -is [PSCustomObject]) {
    $record = @{}
    foreach ($property in $Value.PSObject.Properties) {
      $record[$property.Name] = $property.Value
    }
    return ConvertTo-StableJson $record
  }

  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    $items = @()
    foreach ($item in $Value) {
      $items += (ConvertTo-StableJson $item)
    }
    return '[' + ($items -join ',') + ']'
  }

  return (ConvertTo-Json $Value -Compress)
}

function Get-HmacSha256Hex {
  param(
    [Parameter(Mandatory = $true)][string]$Secret,
    [Parameter(Mandatory = $true)][string]$Message
  )

  $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
  $hmac = New-Object System.Security.Cryptography.HMACSHA256 -ArgumentList @(,$secretBytes)
  try {
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Message))
    return ([BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant()
  } finally {
    $hmac.Dispose()
  }
}

function New-IntegrationAuthHeaders {
  param(
    [Parameter(Mandatory = $true)][string]$Channel,
    [Parameter(Mandatory = $true)][object]$Payload,
    [Parameter(Mandatory = $true)][string]$Secret,
    [Parameter(Mandatory = $true)][string]$Timestamp
  )

  $canonicalPayload = ConvertTo-StableJson $Payload
  $signedMessage = "$Timestamp.$Channel.$canonicalPayload"
  $signatureHex = Get-HmacSha256Hex -Secret $Secret -Message $signedMessage

  return @{
    'x-integration-timestamp' = $Timestamp
    'x-integration-signature' = "sha256=$signatureHex"
  }
}

function New-IngestBody {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('site', 'mango', 'telegram', 'max')][string]$Channel,
    [Parameter(Mandatory = $true)][string]$ExternalId,
    [Parameter(Mandatory = $true)][string]$Phone,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $eventTime = (Get-Date).ToString('o')

  if ($Channel -eq 'site') {
    return @{
      channel = 'site'
      externalId = $ExternalId
      correlationId = "corr-$ExternalId"
      payload = @{
        lead = @{
          contactName = "$Label Site"
          contactPhone = $Phone
          contactCompany = 'Stage6 LLC'
          comment = 'stage6 signed ingest smoke'
        }
        eventTime = $eventTime
      }
    }
  }

  if ($Channel -eq 'mango') {
    return @{
      channel = 'mango'
      externalId = $ExternalId
      correlationId = "corr-$ExternalId"
      payload = @{
        call = @{
          callId = "call-$ExternalId"
          phone = $Phone
          timestamp = $eventTime
        }
        lead = @{
          contactName = "$Label Mango"
          contactPhone = $Phone
        }
      }
    }
  }

  if ($Channel -eq 'telegram') {
    return @{
      channel = 'telegram'
      externalId = $ExternalId
      correlationId = "corr-$ExternalId"
      payload = @{
        sender = @{
          senderId = "tg-$ExternalId"
          username = 'stage6_bot'
          phone = $Phone
        }
        message = @{
          text = 'stage6 telegram signed smoke'
          timestamp = $eventTime
        }
      }
    }
  }

  return @{
    channel = 'max'
    externalId = $ExternalId
    correlationId = "corr-$ExternalId"
    payload = @{
      requestId = "req-$ExternalId"
      contact = @{
        name = "$Label Max"
        phone = $Phone
      }
      eventTime = $eventTime
    }
  }
}

function Invoke-Ingest {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Body,
    [hashtable]$Headers
  )

  $json = $Body | ConvertTo-Json -Depth 20
  if ($null -eq $Headers -or $Headers.Count -eq 0) {
    return Invoke-RestMethod -Method Post -Uri "$base/integrations/events/ingest" -ContentType 'application/json' -Body $json
  }

  return Invoke-RestMethod -Method Post -Uri "$base/integrations/events/ingest" -Headers $Headers -ContentType 'application/json' -Body $json
}

function Test-ErrorContains {
  param(
    [Parameter(Mandatory = $true)]$ErrorRecord,
    [Parameter(Mandatory = $true)][string]$Needle
  )

  $details = $ErrorRecord.ErrorDetails.Message
  if ([string]::IsNullOrWhiteSpace($details)) {
    return $false
  }

  return $details.IndexOf($Needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

$channelSecretEnv = @{
  site = 'INTEGRATION_SITE_SECRET'
  mango = 'INTEGRATION_MANGO_SECRET'
  telegram = 'INTEGRATION_TELEGRAM_SECRET'
  max = 'INTEGRATION_MAX_SECRET'
}

$channelSecrets = @{}
foreach ($channel in @('site', 'mango', 'telegram', 'max')) {
  $channelSecrets[$channel] = Get-ConfigValue -Key $channelSecretEnv[$channel]
}

if ($StrictProfile) {
  foreach ($channel in @('site', 'mango', 'telegram', 'max')) {
    if ([string]::IsNullOrWhiteSpace($channelSecrets[$channel])) {
      throw "Strict profile requires configured secret for channel=$channel"
    }
  }
}

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@katet.local'; password = 'admin123' } | ConvertTo-Json)
$T = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Host 'LOGIN OK'

$authProbeExternalId = "STAGE6-PROBE-$([Guid]::NewGuid().ToString('N').Substring(0, 10))"
$authProbeBody = New-IngestBody -Channel 'site' -ExternalId $authProbeExternalId -Phone '+7 (495) 800-12-01' -Label 'Auth Probe'
$authEnforced = $false
try {
  Invoke-Ingest -Body $authProbeBody | Out-Null
  Write-Host 'INGEST AUTH PROBE optional-mode (no mandatory shared secret)'
} catch {
  if (Test-ErrorContains -ErrorRecord $_ -Needle 'Missing integration auth headers') {
    $authEnforced = $true
    Write-Host 'INGEST AUTH PROBE enforced-mode (headers required)'
  } else {
    throw
  }
}

if ($StrictProfile -and -not $authEnforced) {
  throw 'Strict profile requires enforced integration auth mode (set INTEGRATION_REQUIRE_SIGNATURES=true in backend runtime)'
}

$siteSecret = $channelSecrets['site']
if ($authEnforced -and [string]::IsNullOrWhiteSpace($siteSecret)) {
  throw 'Integration auth is enforced but site secret was not found in process env or backend/.env'
}

$externalId = "STAGE6-$([Guid]::NewGuid().ToString('N').Substring(0, 12))"
$mainBody = New-IngestBody -Channel 'site' -ExternalId $externalId -Phone '+7 (495) 800-11-22' -Label 'Stage6 Integration Smoke'
$mainHeaders = @{}
if (-not [string]::IsNullOrWhiteSpace($siteSecret)) {
  $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
  $mainHeaders = New-IntegrationAuthHeaders -Channel 'site' -Payload $mainBody.payload -Secret $siteSecret -Timestamp $timestamp
}

$first = Invoke-Ingest -Body $mainBody -Headers $mainHeaders
if (-not $first.event -or -not $first.event.id) {
  throw 'Ingest response does not include event.id'
}
if ($first.deduplicated) {
  throw 'First ingest unexpectedly marked as deduplicated'
}
Write-Host "INGEST #1 id=$($first.event.id) status=$($first.event.status)"

$second = Invoke-Ingest -Body $mainBody -Headers $mainHeaders
if (-not $second.deduplicated) {
  throw 'Second ingest is expected to be deduplicated'
}
if ($second.event.id -ne $first.event.id) {
  throw 'Deduplicated ingest returned a different event id'
}
Write-Host "IDEMPOTENCY OK event=$($second.event.id)"

if (($authEnforced -or $StrictProfile) -and -not [string]::IsNullOrWhiteSpace($siteSecret)) {
  $badExternalId = "STAGE6-BADSIG-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
  $badBody = New-IngestBody -Channel 'site' -ExternalId $badExternalId -Phone '+7 (495) 800-12-44' -Label 'Bad Signature'
  $badTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
  $badHeaders = @{
    'x-integration-timestamp' = $badTimestamp
    'x-integration-signature' = ('sha256=' + ('0' * 64))
  }

  $signatureBlocked = $false
  try {
    Invoke-Ingest -Body $badBody -Headers $badHeaders | Out-Null
  } catch {
    $signatureBlocked = (Test-ErrorContains -ErrorRecord $_ -Needle 'Invalid integration signature')
    if (-not $signatureBlocked) {
      throw
    }
  }

  if (-not $signatureBlocked) {
    throw 'Invalid signature was accepted while auth is enforced'
  }
  Write-Host 'SIGNATURE GUARD OK'
}

$signedChannelsVerified = 0
foreach ($channel in @('site', 'mango', 'telegram', 'max')) {
  $secret = $channelSecrets[$channel]
  if ([string]::IsNullOrWhiteSpace($secret)) {
    Write-Host "SIGNED FIXTURE SKIP channel=$channel (secret is not configured)"
    continue
  }

  $fixtureExternalId = "STAGE6-$channel-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
  $phone = switch ($channel) {
    'site' { '+7 (495) 800-21-01' }
    'mango' { '+7 (495) 800-21-02' }
    'telegram' { '+7 (495) 800-21-03' }
    default { '+7 (495) 800-21-04' }
  }

  $body = New-IngestBody -Channel $channel -ExternalId $fixtureExternalId -Phone $phone -Label "Stage6 $channel"
  $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
  $headers = New-IntegrationAuthHeaders -Channel $channel -Payload $body.payload -Secret $secret -Timestamp $ts

  $signedFirst = Invoke-Ingest -Body $body -Headers $headers
  if ($signedFirst.deduplicated) {
    throw "Signed fixture first ingest unexpectedly deduplicated for channel=$channel"
  }
  if (-not $signedFirst.event -or -not $signedFirst.event.id) {
    throw "Signed fixture response does not include event.id for channel=$channel"
  }

  $signedSecond = Invoke-Ingest -Body $body -Headers $headers
  if (-not $signedSecond.deduplicated) {
    throw "Signed fixture second ingest must be deduplicated for channel=$channel"
  }

  Write-Host "SIGNED FIXTURE OK channel=$channel event=$($signedFirst.event.id)"
  $signedChannelsVerified++
}

if ($signedChannelsVerified -eq 0) {
  if ($authEnforced -or $StrictProfile) {
    throw 'Integration auth is enforced but no channel secrets were resolved for signed fixtures'
  }
  Write-Host 'SIGNED FIXTURE SKIP no configured channel secrets (dev optional mode)'
}

$list = Invoke-RestMethod -Uri "$base/integrations/events?channel=site&query=$externalId&take=20" -Headers $T
if (-not $list -or $list.total -lt 1) {
  throw 'Expected at least one integration event in list()'
}
Write-Host "LIST OK total=$($list.total)"

$eventId = $first.event.id
$event = Invoke-RestMethod -Uri "$base/integrations/events/$eventId" -Headers $T
if (-not $event -or $event.id -ne $eventId) {
  throw 'getById did not return expected event'
}
Write-Host "GET BY ID OK status=$($event.status)"

$retryBlocked = $false
try {
  Invoke-RestMethod -Method Post -Uri "$base/integrations/events/$eventId/retry" -Headers $T -ContentType 'application/json' -Body (@{ reason = 'stage6 smoke guard check' } | ConvertTo-Json) | Out-Null
} catch {
  $retryBlocked = $true
  Write-Host 'RETRY GUARD OK'
}
if (-not $retryBlocked) {
  throw 'Retry should be blocked for non-failed events'
}

$replayBlocked = $false
try {
  Invoke-RestMethod -Method Post -Uri "$base/integrations/events/$eventId/replay" -Headers $T -ContentType 'application/json' -Body (@{ reason = 'stage6 smoke guard check' } | ConvertTo-Json) | Out-Null
} catch {
  $replayBlocked = $true
  Write-Host 'REPLAY GUARD OK'
}
if (-not $replayBlocked) {
  throw 'Replay should be blocked for non-failed events'
}

Write-Host '=== STAGE 6 INTEGRATIONS OK ==='
