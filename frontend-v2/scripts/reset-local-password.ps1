<#
.SYNOPSIS
  Safely resets a local user password on local Supabase without exposing it in logs or git.
.DESCRIPTION
  Controlled local-only utility to set a new password for local development accounts.
  Prompts using Read-Host -AsSecureString so passwords are never printed or logged.
.EXAMPLE
  .\frontend-v2\scripts\reset-local-password.ps1 -Email "localhr@tpp.com"
#>
[CmdletBinding()]
param(
  [string]$Email = "localhr@tpp.com",
  [string]$SupabaseUrl = "http://127.0.0.1:54321",
  [System.Security.SecureString]$Password
)

$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Local Supabase Password Reset Utility (Local-Only)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target User: $Email" -ForegroundColor Yellow
Write-Host "Supabase Endpoint: $SupabaseUrl" -ForegroundColor Yellow

$plainPass = $null

if ($Password) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
  $plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
} elseif ($env:NEW_PASSWORD) {
  $plainPass = $env:NEW_PASSWORD
} else {
  $securePass = Read-Host "Enter new local password (hidden)" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
  $plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($plainPass)) {
  Write-Error "Password cannot be empty."
  exit 1
}

$headers = @{
  "apikey" = $ServiceRoleKey
  "Authorization" = "Bearer $ServiceRoleKey"
  "Content-Type" = "application/json"
}

try {
  $usersResponse = Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/admin/users" -Headers $headers -Method Get
  $user = $usersResponse.users | Where-Object { $_.email -eq $Email }

  if (-not $user) {
    Write-Error "User '$Email' not found in local auth.users."
    exit 1
  }

  $body = @{
    password = $plainPass
    email_confirm = $true
  } | ConvertTo-Json

  $updateRes = Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/admin/users/$($user.id)" -Headers $headers -Method Put -Body $body

  Write-Host ""
  Write-Host "[SUCCESS] Local password for $Email has been updated." -ForegroundColor Green
  Write-Host "Account ID: $($user.id)" -ForegroundColor Gray
  Write-Host "You can now log in at http://localhost:5174/login (or http://localhost:5173/login)." -ForegroundColor Green
}
catch {
  Write-Error "Failed to reset password: $_"
  exit 1
}
