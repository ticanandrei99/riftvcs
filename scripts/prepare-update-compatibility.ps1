param([string]$InstallerDirectory,[string]$OutputDirectory)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$version=(Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
if(-not $InstallerDirectory){$InstallerDirectory=Join-Path $projectRoot 'src-tauri/target/release/bundle/nsis'}
if(-not $OutputDirectory){$OutputDirectory=Join-Path $projectRoot ('artifacts/distribution/v'+$version+'/legacy-updater-assets')}
$sourceDirectory=[IO.Path]::GetFullPath($InstallerDirectory)
$outputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$names=@()
foreach($caster in @($false,$true)){
  $product=if($caster){'Voxdria Caster'}else{'Voxdria'}
  $legacyProduct=if($caster){'RiftVoice Caster'}else{'RiftVoice'}
  $canonical=$product+'_'+$version+'_x64-setup.exe'
  $legacy=$legacyProduct+'_'+$version+'_x64-setup.exe'
  $source=Join-Path $sourceDirectory $canonical
  $target=Join-Path $outputDirectory $legacy
  if((Get-Item -LiteralPath $source).VersionInfo.ProductVersion -ne $version){throw 'Compatibility alias must use a current Voxdria installer'}
  Copy-Item -LiteralPath $source -Destination $target -Force
  if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash){throw 'Compatibility alias differs from the canonical installer'}
  $names+=$legacy
}
$names | ForEach-Object {Get-FileHash -LiteralPath (Join-Path $outputDirectory $_) -Algorithm SHA256} | ForEach-Object {"$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))"} | Set-Content -LiteralPath (Join-Path $outputDirectory 'SHA256SUMS.txt')
$instructions=@"
Voxdria $version - aliasuri numai pentru updaterul RiftVoice vechi

Aceste doua EXE sunt copii IDENTICE ale installerelor Voxdria/Voxdria Caster,
cu numele de asset asteptate de versiunile RiftVoice deja distribuite.
Incarca-le individual in acelasi release stabil v$version, pe langa cele doua
installere canonice Voxdria. Un ZIP singur nu declanseaza notificarea.
Utilizatorilor noi le distribui installerele cu numele Voxdria.
Nu sunt executabile RiftVoice vechi si nu trebuie reconstruite separat.
Citeste ghidul MIGRARE-NUME.ro.md / docs/rebrand.ro.md.
"@
[IO.File]::WriteAllText((Join-Path $outputDirectory 'CITESTE-INAINTE.ro.txt'),$instructions,[Text.UTF8Encoding]::new($false))
Write-Host "Prepared hash-identical legacy updater aliases: $outputDirectory"
