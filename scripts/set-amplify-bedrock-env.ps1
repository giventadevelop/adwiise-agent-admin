# Merge Admin Help Bedrock env vars into Amplify app environment (does not wipe other keys).
# Amplify Hosting apps for this account are in us-east-2; Bedrock Runtime stays us-east-1.
#
# Usage:
#   .\scripts\set-amplify-bedrock-env.ps1
#   .\scripts\set-amplify-bedrock-env.ps1 -AppId d3qk5eouzr7b80   # dev hub
#   .\scripts\set-amplify-bedrock-env.ps1 -StartRelease
#
# Requires: AWS CLI; set AWS_CA_BUNDLE empty only if corporate SSL breaks CLI JSON.

param(
    # Production hub (www.adwiiseagent.ai)
    [string]$AppId = "d3gov7yn1ctow1",
    [string]$Region = "us-east-2",
    [string]$BranchName = "release/v1.0.0",
    [string]$Enabled = "true",
    [string]$BedrockRegion = "us-east-1",
    [string]$ModelId = "us.anthropic.claude-sonnet-5-5",
    [int]$MinExistingKeys = 10,
    [switch]$StartRelease
)

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] AWS CLI is not installed." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Merging Bedrock env vars into Amplify app $AppId ($Region)" -ForegroundColor Green

# Strip SSL/urllib3 noise so ConvertFrom-Json does not fail and wipe env.
$raw = aws amplify get-app --app-id $AppId --region $Region --output json 2>&1 | Out-String
$jsonStart = $raw.IndexOf('{')
if ($jsonStart -lt 0) {
    Write-Host "[ERROR] aws amplify get-app returned no JSON:" -ForegroundColor Red
    Write-Host $raw
    exit 1
}
$appJson = $raw.Substring($jsonStart)
try {
    $app = $appJson | ConvertFrom-Json
} catch {
    Write-Host "[ERROR] Failed to parse get-app JSON (refusing to update — would wipe env):" -ForegroundColor Red
    Write-Host $_
    exit 1
}

$envVars = @{}
if ($app.app.environmentVariables) {
    $app.app.environmentVariables.PSObject.Properties | ForEach-Object {
        $envVars[$_.Name] = [string]$_.Value
    }
}

$existingCount = $envVars.Count
if ($existingCount -gt 0 -and $existingCount -lt $MinExistingKeys) {
    Write-Host "[ERROR] App currently has only $existingCount env keys (expected >= $MinExistingKeys)." -ForegroundColor Red
    Write-Host "Refusing to merge — restore full env from .env.production first, then re-run." -ForegroundColor Yellow
    exit 1
}
if ($existingCount -eq 0) {
    Write-Host "[ERROR] App has ZERO environment variables. Restore from backup before merging Bedrock." -ForegroundColor Red
    exit 1
}

$envVars["BEDROCK_ENABLED"] = $Enabled
$envVars["BEDROCK_REGION"] = $BedrockRegion
$envVars["BEDROCK_MODEL_ID"] = $ModelId

Write-Host "[INFO] Existing keys: $existingCount; after merge: $($envVars.Count)" -ForegroundColor Cyan
Write-Host "   BEDROCK_ENABLED=$Enabled"
Write-Host "   BEDROCK_REGION=$BedrockRegion"
Write-Host "   BEDROCK_MODEL_ID=$ModelId"

$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, ($envVars | ConvertTo-Json -Compress), [System.Text.Encoding]::ASCII)

$result = aws amplify update-app `
    --app-id $AppId `
    --environment-variables "file://$tempFile" `
    --region $Region 2>&1

Remove-Item $tempFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] update-app failed:" -ForegroundColor Red
    Write-Host $result
    exit 1
}

Write-Host "[SUCCESS] Amplify app env updated with Bedrock enabled (preserved $existingCount prior keys)." -ForegroundColor Green

if ($StartRelease) {
    Write-Host "[INFO] Starting RELEASE job on branch $BranchName ..." -ForegroundColor Yellow
    aws amplify start-job --app-id $AppId --branch-name $BranchName --job-type RELEASE --region $Region
}
else {
    Write-Host "[NOTE] Redeploy when ready:" -ForegroundColor Yellow
    Write-Host "   aws amplify start-job --app-id $AppId --branch-name $BranchName --job-type RELEASE --region $Region"
}
