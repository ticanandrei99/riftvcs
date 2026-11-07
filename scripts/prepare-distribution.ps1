param([string]$VerificationReceipt = 'verification/original-player-release-verification.json')
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'prepare-original-distribution.ps1') -VerificationReceipt $VerificationReceipt
