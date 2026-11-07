param([string]$VerificationReceipt = 'verification/original-player-release-verification.json')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
$receipt = Get-Content -Raw -LiteralPath (Join-Path $projectRoot $VerificationReceipt) | ConvertFrom-Json
if ($receipt.version -ne $version -or $receipt.status -ne 'passed' -or $receipt.variant -ne 'player') { throw 'A current verified player build receipt is required.' }
$installerName = 'Voxdria_'+$version+'_x64-setup.exe'
$installerPath = Join-Path $projectRoot ('src-tauri/target/release/bundle/nsis/'+$installerName)
$expectedHash = $receipt.installerHashes.PSObject.Properties[$installerName].Value
if (-not $expectedHash -or (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToLower() -ne $expectedHash) { throw 'Installer does not match the verified player build.' }
& node (Join-Path $PSScriptRoot 'verify-original-source.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Original source verification failed.' }
$destinationRoot = Join-Path $projectRoot ('artifacts/distribution/v'+$version)
$releaseDirectory = Join-Path $destinationRoot 'release'
$githubDirectory = Join-Path $destinationRoot 'github'
New-Item -ItemType Directory -Force -Path $releaseDirectory,$githubDirectory | Out-Null
& (Join-Path $PSScriptRoot 'package-windows.ps1') -Variant player -OutputDirectory $releaseDirectory
$sourceZip = Join-Path $releaseDirectory 'Voxdria-source.zip'
$githubZip = Join-Path $githubDirectory ('Voxdria-v'+$version+'-GitHub.zip')
Copy-Item -LiteralPath $sourceZip -Destination $githubZip -Force
$guides = @{
    'docs/player-original.ro.md' = 'START.ro.md'
    'docs/verification-0.4.3.ro.md' = 'VERIFICARI.ro.md'
    'docs/RELEASE-NOTES.ro.md' = 'RELEASE-NOTES.ro.md'
}
foreach ($guide in $guides.GetEnumerator()) { Copy-Item -LiteralPath (Join-Path $projectRoot $guide.Key) -Destination (Join-Path $releaseDirectory $guide.Value) -Force }
# Keep relative documentation links usable in the complete release folder.
$releaseDocs=Join-Path $releaseDirectory 'docs'
New-Item -ItemType Directory -Force -Path $releaseDocs | Out-Null
foreach($item in Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs') -Force) { Copy-Item -LiteralPath $item.FullName -Destination $releaseDocs -Recurse -Force }
$startPath=Join-Path $releaseDirectory 'START.ro.md'
$startText=[IO.File]::ReadAllText($startPath).Replace('](caster-mode.ro.md)','](docs/caster-mode.ro.md)')
[IO.File]::WriteAllText($startPath,$startText,[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $projectRoot $VerificationReceipt) -Destination (Join-Path $releaseDirectory 'BUILD-VERIFICATION.json') -Force
$files=@(Get-ChildItem -LiteralPath $releaseDirectory -Recurse -File | Where-Object {$_.Name -ne 'SHA256SUMS.txt' -and $_.Extension -ne '.zip' -or $_.FullName -eq $sourceZip})
$files | ForEach-Object { $relative=$_.FullName.Substring($releaseDirectory.Length+1).Replace('\','/'); $hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower(); "$hash  $relative" } | Set-Content -LiteralPath (Join-Path $releaseDirectory 'SHA256SUMS.txt') -Encoding utf8
$releaseZip = Join-Path $destinationRoot ('Voxdria-v'+$version+'-Release.zip')
if (Test-Path -LiteralPath $releaseZip) { throw 'Inspect the existing release archive before replacing it.' }
[IO.Compression.ZipFile]::CreateFromDirectory($releaseDirectory,$releaseZip,[IO.Compression.CompressionLevel]::Optimal,$false)
& (Join-Path $PSScriptRoot 'prepare-browser-upload.ps1')
@($githubZip,$releaseZip,(Join-Path $githubDirectory ('Voxdria-v'+$version+'-GitHub-browser.zip'))) | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } | Set-Content -LiteralPath (Join-Path $destinationRoot 'SHA256SUMS.txt') -Encoding utf8
Write-Output "Verified player-only release prepared: $destinationRoot"
