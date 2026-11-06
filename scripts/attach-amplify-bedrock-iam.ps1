# Attach Bedrock InvokeModel policy to an Amplify / SSR IAM role.
# Discover role ARN from Amplify Console → App settings → General → Service role,
# or from: aws amplify get-app --app-id <id> --query app.iamServiceRoleArn
#
# Usage:
#   .\scripts\attach-amplify-bedrock-iam.ps1 -RoleName amplifyconsole-backend-role
#   .\scripts\attach-amplify-bedrock-iam.ps1 -RoleArn arn:aws:iam::224674645062:role/YourAmplifyRole

param(
    [string]$RoleName = "",
    [string]$RoleArn = "",
    [string]$PolicyName = "AdminHelpBedrockInvoke",
    [string]$PolicyFile = "documentation/admin_help_chat/bedrock-invoke-policy.json",
    [string]$Region = "us-east-1"
)

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] AWS CLI is not installed." -ForegroundColor Red
    exit 1
}

if (-not $RoleName -and $RoleArn) {
    if ($RoleArn -match '/([^/]+)$') { $RoleName = $Matches[1] }
}

if (-not $RoleName) {
    Write-Host "[ERROR] Provide -RoleName or -RoleArn for the Amplify SSR / service role." -ForegroundColor Red
    Write-Host "This IAM user currently sees zero Amplify apps via API; copy the role from the Amplify Console." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $PolicyFile)) {
    Write-Host "[ERROR] Policy file not found: $PolicyFile" -ForegroundColor Red
    exit 1
}

$policyDoc = Get-Content -Raw $PolicyFile
$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, $policyDoc, [System.Text.Encoding]::ASCII)

Write-Host "[INFO] Putting inline policy $PolicyName on role $RoleName" -ForegroundColor Green
$result = aws iam put-role-policy `
    --role-name $RoleName `
    --policy-name $PolicyName `
    --policy-document "file://$tempFile" `
    --region $Region 2>&1

Remove-Item $tempFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] put-role-policy failed:" -ForegroundColor Red
    Write-Host $result
    exit 1
}

Write-Host "[SUCCESS] Role $RoleName can invoke Bedrock for Admin Help." -ForegroundColor Green
