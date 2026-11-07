$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
$githubDirectory = Join-Path $projectRoot ('artifacts/distribution/v' + $version + '/github')
$sourceZip = Join-Path $githubDirectory ('Voxdria-v' + $version + '-GitHub.zip')
$staging = Join-Path $projectRoot ('verification/github-browser-upload-' + $version + '-' + (Get-Date -Format 'yyyyMMddHHmmss'))
$categories = @('Server-Render','Aplicatie','Teste-Modele','Documentatie-Scripturi')
$categoryCounts = @(0,0,0,0)
$groups = [Collections.Generic.List[string]]::new()
$counts = @{}
$archive = [IO.Compression.ZipFile]::OpenRead($sourceZip)
try {
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    $name = $entry.FullName.Replace('\','/')
    $category = if ($name -match '^server/' -or $name -notmatch '/') { 0 }
      elseif ($name -match '^(src|src-tauri)/') { 1 }
      elseif ($name -match '^(tests|assets|models|icons)/') { 2 }
      elseif ($name -match '^(docs|scripts|vendor|upstream|\.github)/') { 3 }
      else { throw "Unexpected source root: $name" }
    $part = [int][Math]::Floor($categoryCounts[$category] / 99) + 1
    $group = '{0:D2}-{1}-{2:D2}' -f ($category + 1),$categories[$category],$part
    if (-not $counts.ContainsKey($group)) {
      $groups.Add($group); $counts[$group] = 0
      New-Item -ItemType Directory -Path (Join-Path $staging $group) -Force | Out-Null
    }
    $base = [IO.Path]::GetFullPath((Join-Path $staging $group))
    $destination = [IO.Path]::GetFullPath((Join-Path $base $name))
    if (-not $destination.StartsWith($base + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe source archive path' }
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$destination,$false)
    $counts[$group]++
    $categoryCounts[$category]++
  }
} finally { $archive.Dispose() }
$groups = @($groups | Sort-Object)
foreach ($group in $groups) { if ($counts[$group] -gt 99) { throw "Batch exceeds the GitHub browser limit: $group" } }
$instructions = @"
Voxdria $version - incarcare GitHub din browser

Extrage arhiva. Deschide repository-ul in RADACINA, apoi Add file > Upload files.
Incarca PE RAND CONTINUTUL fiecarui folder numerotat, direct din radacina repo-ului:
$($groups | ForEach-Object { $_ + ' - ' + $counts[$_] + ' fisiere' } | Out-String)
Nu incarca ZIP-ul ca surse si nu incarca folderele numerotate ca directoare din repo.
Pastreaza structura server/, src/, src-tauri/, etc. din interiorul lor.
Incarca toate loturile inainte de deploy. Fiecare lot are cel mult 99 de fisiere.
O categorie mare este impartita automat in mai multe loturi; pastreaza structura lor.
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
