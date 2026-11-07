param([string]$OutputDirectory, [ValidateSet('player','caster')][string]$Variant = 'player')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'artifacts' }
$delivery = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $delivery | Out-Null
$version = (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
$product = if ($Variant -eq 'caster') { 'Voxdria Caster' } else { 'Voxdria' }
$installerName = '{0}_{1}_x64-setup.exe' -f $product, $version
$installers = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src-tauri/target/release/bundle/nsis') | Where-Object { $_.Name -eq $installerName })
if ($installers.Count -ne 1) { throw "Build and verify the $Variant installer first." }
# The raw target/release executable is overwritten when switching variants.
# Package the selected installer, never a potentially mismatched portable exe.
$outputs = @()
foreach ($file in @($installers[0].FullName, (Join-Path $projectRoot 'LICENSE'), (Join-Path $projectRoot 'NOTICE.md'))) {
    $destination = Join-Path $delivery ([IO.Path]::GetFileName($file))
    Copy-Item -LiteralPath $file -Destination $destination -Force
    $outputs += $destination
}
# Explicit source roots; do not package local credentials, dependencies or captures.
$sourceRoots = @('.github','assets','docs','icons','models','scripts','server','src','src-tauri','tests','vendor')
$rootFiles = @('.env.example','.gitattributes','.gitignore','CHANGELOG.md','CONTRIBUTING.md','docker-compose.proxchat.yml','jest.config.js','jest.e2e.config.js','LICENSE','NOTICE.md','package.json','package-lock.json','README.md','render.yaml','rust-toolchain.toml','SECURITY.md','tsconfig.json','tsconfig.test.json','webpack.config.js')
$excludedDirs = @('node_modules','target','dist','.git','__pycache__','synthetic-data','champion-circles','fixtures-real','fixtures-icons','fixtures-games','artifacts','verification')
function Get-SourceFiles([string]$folder) {
    foreach ($item in Get-ChildItem -LiteralPath $folder -Force) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Source links are not supported: $($item.FullName)" }
        if ($item.PSIsContainer) { if ($item.Name -notin $excludedDirs) { Get-SourceFiles $item.FullName }; continue }
        if (($item.Name -like '.env*' -and $item.Name -ne '.env.example') -or $item.Name -like '*.private.json' -or $item.Name -like '*audit*.json' -or $item.Extension -in @('.pem','.key','.pfx','.p12','.pyc','.pt','.log')) { continue }
        $item.FullName
    }
}
$files = @($rootFiles | ForEach-Object { $p = Join-Path $projectRoot $_; if (Test-Path -LiteralPath $p) { $p } })
foreach ($sourceRoot in $sourceRoots) {
    $path = Join-Path $projectRoot $sourceRoot
    if (Test-Path -LiteralPath $path) { $files += @(Get-SourceFiles $path) }
}
$sourceZip = Join-Path $delivery 'Voxdria-source.zip'
$zipStream = [IO.File]::Open($sourceZip, [IO.FileMode]::Create)
$archive = [IO.Compression.ZipArchive]::new($zipStream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in ($files | Sort-Object -Unique)) {
        $relative = $file.Substring($projectRoot.Length + 1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file, $relative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $zipStream.Dispose() }
$outputs += $sourceZip
$outputs | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } | Set-Content -LiteralPath (Join-Path $delivery 'SHA256SUMS.txt')
Write-Host "Windows package with corresponding source: $delivery"

