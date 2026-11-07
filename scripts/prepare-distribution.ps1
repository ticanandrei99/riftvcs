param([string]$VerificationReceipt = 'verification/organizer-release-verification.json')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
$receipt = Get-Content -Raw -LiteralPath (Join-Path $projectRoot $VerificationReceipt) | ConvertFrom-Json
if ($receipt.version -ne $version -or $receipt.status -ne 'passed') { throw 'A current verified-build receipt is required.' }
foreach ($name in @(('Voxdria_'+$version+'_x64-setup.exe'),('Voxdria Caster_'+$version+'_x64-setup.exe'))) {
  $builtInstaller = Join-Path $projectRoot ('src-tauri/target/release/bundle/nsis/' + $name)
  $expectedHash = $receipt.installerHashes.PSObject.Properties[$name].Value
  if (-not $expectedHash -or (Get-FileHash -LiteralPath $builtInstaller -Algorithm SHA256).Hash.ToLower() -ne $expectedHash) { throw "Installer does not match the verified receipt: $name" }
}
$destinationRoot = Join-Path $projectRoot ('artifacts/distribution/v' + $version)
$githubDirectory = Join-Path $destinationRoot 'github'
$releaseDirectory = Join-Path $destinationRoot 'release'
New-Item -ItemType Directory -Force -Path $githubDirectory,$releaseDirectory | Out-Null
# Collect only explicitly selected production installers. target/release/voxdria.exe
# can belong to another variant or a QA build and is never a distribution input.
& (Join-Path $PSScriptRoot 'package-windows.ps1') -Variant player -OutputDirectory $releaseDirectory
& (Join-Path $PSScriptRoot 'package-windows.ps1') -Variant caster -OutputDirectory $releaseDirectory
$githubZip = Join-Path $githubDirectory ('Voxdria-v' + $version + '-GitHub.zip')
Copy-Item -LiteralPath (Join-Path $releaseDirectory 'Voxdria-source.zip') -Destination $githubZip -Force
$guides = @{
  'docs/enemy-camera.ro.md' = 'INAMICI-CAMERA.ro.md'
  'docs/caster-mode.ro.md' = 'CASTER-OBS.ro.md'
  'docs/organizer.ro.md' = 'ORGANIZARE-MODERARE.ro.md'
  'docs/caster-invites.ro.md' = 'INVITATII-CASTER.ro.md'
  'docs/custom-test.ro.md' = 'TEST-CUSTOM.ro.md'
  'docs/RENDER.ro.md' = 'HOST-RENDER.ro.md'
  'docs/verification-results.ro.md' = 'VERIFICARI.ro.md'
  'docs/verification-0.1.0.ro.md' = 'VERIFICARI-0.1.0.ro.md'
  'docs/verification-0.2.0.ro.md' = 'VERIFICARI-0.2.0.ro.md'
  'docs/verification-0.3.0.ro.md' = 'VERIFICARI-0.3.0.ro.md'
  'docs/verification-0.4.0.ro.md' = 'VERIFICARI-0.4.0.ro.md'
  'docs/verification-0.4.1.ro.md' = 'VERIFICARI-0.4.1.ro.md'
  'docs/function-checklist.ro.md' = 'FUNCTII-VERIFICATE.ro.md'
  'docs/security-review.ro.md' = 'SECURITATE.ro.md'
  'docs/threat-model.md' = 'MODEL-AMENINTARI.md'
  'docs/comparison.ro.md' = 'COMPARATIE.ro.md'
  'docs/rebrand.ro.md' = 'MIGRARE-NUME.ro.md'
  'docs/discord.ro.md' = 'DISCORD-STREAMER.ro.md'
  'docs/RELEASE-NOTES.ro.md' = 'RELEASE-NOTES.ro.md'
  'docs/DISTRIBUTION.ro.md' = 'START.ro.md'
}
foreach ($entry in $guides.GetEnumerator()) {
  $guideText = [IO.File]::ReadAllText((Join-Path $projectRoot $entry.Key))
  foreach ($target in $guides.GetEnumerator()) {
    $guideText = $guideText.Replace(('](' + [IO.Path]::GetFileName($target.Key) + ')'),('](' + $target.Value + ')'))
  }
  [IO.File]::WriteAllText((Join-Path $releaseDirectory $entry.Value),$guideText,[Text.UTF8Encoding]::new($false))
}
$names = @(('Voxdria_'+$version+'_x64-setup.exe'),('Voxdria Caster_'+$version+'_x64-setup.exe'),'Voxdria-source.zip','LICENSE','NOTICE.md') + @($guides.Values)
$paths = @($names | ForEach-Object { Join-Path $releaseDirectory $_ })
$paths | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } | Set-Content -LiteralPath (Join-Path $releaseDirectory 'SHA256SUMS.txt')
$paths += Join-Path $releaseDirectory 'SHA256SUMS.txt'
$releaseZip = Join-Path $releaseDirectory ('Voxdria-v' + $version + '-Release.zip')
$stream = [IO.File]::Open($releaseZip,[IO.FileMode]::Create)
$archive = [IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $paths) { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file,[IO.Path]::GetFileName($file),[IO.Compression.CompressionLevel]::Optimal) | Out-Null }
} finally { $archive.Dispose(); $stream.Dispose() }
$legacyDirectory=Join-Path $destinationRoot 'legacy-updater-assets'
& (Join-Path $PSScriptRoot 'prepare-update-compatibility.ps1') -InstallerDirectory $releaseDirectory -OutputDirectory $legacyDirectory
$legacyZip=Join-Path $destinationRoot ('Voxdria-v'+$version+'-Legacy-updater-assets.zip')
if(Test-Path -LiteralPath $legacyZip){throw 'Inspect an existing legacy archive before replacing it'}
[IO.Compression.ZipFile]::CreateFromDirectory($legacyDirectory,$legacyZip,[IO.Compression.CompressionLevel]::Optimal,$false)
@($githubZip,$releaseZip,$legacyZip) | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } | Set-Content -LiteralPath (Join-Path $destinationRoot 'SHA256SUMS.txt')
Write-Host "Prepared GitHub source and Windows release packages: $destinationRoot"
