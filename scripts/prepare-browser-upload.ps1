$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
$githubDirectory = Join-Path $projectRoot ('artifacts/distribution/v' + $version + '/github')
$sourceZip = Join-Path $githubDirectory ('Voxdria-v' + $version + '-GitHub.zip')
$staging = Join-Path $projectRoot ('verification/github-browser-upload-' + $version + '-' + (Get-Date -Format 'yyyyMMddHHmmss'))
$groups = @('01-Server-Render','02-Aplicatie','03-Teste-Modele','04-Documentatie-Scripturi')
foreach ($group in $groups) { New-Item -ItemType Directory -Path (Join-Path $staging $group) -Force | Out-Null }
$counts = @{}; foreach ($group in $groups) { $counts[$group] = 0 }
$archive = [IO.Compression.ZipFile]::OpenRead($sourceZip)
try {
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    $name = $entry.FullName.Replace('\','/')
    $group = if ($name -match '^server/' -or $name -notmatch '/') { $groups[0] }
      elseif ($name -match '^(src|src-tauri)/') { $groups[1] }
      elseif ($name -match '^(tests|assets|models|icons)/') { $groups[2] }
      elseif ($name -match '^(docs|scripts|vendor|\.github)/') { $groups[3] }
      else { throw "Unexpected source root: $name" }
    $base = [IO.Path]::GetFullPath((Join-Path $staging $group))
    $destination = [IO.Path]::GetFullPath((Join-Path $base $name))
    if (-not $destination.StartsWith($base + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe source archive path' }
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$destination,$false)
    $counts[$group]++
  }
} finally { $archive.Dispose() }
foreach ($group in $groups) { if ($counts[$group] -gt 99) { throw "Split this batch further before uploading: $group contains $($counts[$group]) files" } }
$instructions = @"
Voxdria $version - incarcare GitHub din browser

Extrage arhiva. Deschide repository-ul in RADACINA, apoi Add file > Upload files.
Incarca PE RAND CONTINUTUL fiecarui folder numerotat, direct din radacina repo-ului:
$($groups | ForEach-Object { $_ + ' - ' + $counts[$_] + ' fisiere' } | Out-String)
Nu incarca ZIP-ul ca surse si nu incarca folderele numerotate ca directoare din repo.
Pastreaza structura server/, src/, src-tauri/, etc. din interiorul lor.
Primul lot include intregul server si configuratia Render. Nu face deploy partial.
Sursele nu includ parole. Configureaza ORGANIZER_PASSWORD si MODERATOR_ACCOUNTS_JSON
numai in mediul serverului. Citeste docs/organizer.ro.md dupa incarcare.
Installerele se pun separat in Releases, cu tag-ul exact v$version.
"@
[IO.File]::WriteAllText((Join-Path $staging 'CITESTE-INAINTE.ro.txt'),$instructions,[Text.UTF8Encoding]::new($false))
$output = Join-Path $githubDirectory ('Voxdria-v' + $version + '-GitHub-browser.zip')
if (Test-Path -LiteralPath $output) { throw 'Browser archive already exists; inspect before replacing it.' }
[IO.Compression.ZipFile]::CreateFromDirectory($staging,$output,[IO.Compression.CompressionLevel]::Optimal,$false)
@{version=$version;sourceFiles=($counts.Values | Measure-Object -Sum).Sum;groups=$counts;allUnder100=$true;archive=$output} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $projectRoot 'verification/organizer-browser-upload-validation.json') -Encoding utf8
Write-Host "Browser upload archive prepared: $output"
