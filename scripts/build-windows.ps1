param([switch]$SkipTests)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    $cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
    if (Test-Path -LiteralPath $cargoBin) { $env:Path = "$cargoBin;$env:Path" }
}
foreach ($tool in @('node','npm.cmd','cargo')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. See docs/VOXDRIA.md." }
}
function Run-Checked([string]$program, [string[]]$arguments) {
    & $program @arguments
    if ($LASTEXITCODE -ne 0) { throw "$program failed ($LASTEXITCODE)" }
}
Run-Checked 'npm.cmd' @('ci')
Run-Checked 'npm.cmd' @('--prefix','server','ci')
if (-not $SkipTests) {
    Run-Checked 'npm.cmd' @('run','verify')
    # A fresh source checkout has no dist/. Tauri's generated native context
    # embeds those resources even when compiling the native test executable.
    Run-Checked 'npm.cmd' @('run','build:prod')
    Run-Checked 'cargo' @('test','--release','--locked','--features','custom-protocol','--manifest-path','src-tauri/Cargo.toml')
    Run-Checked 'cargo' @('clippy','--release','--locked','--features','custom-protocol','--manifest-path','src-tauri/Cargo.toml','--all-targets','--','-D','warnings')
}
Run-Checked 'npm.cmd' @('run','build:windows')
& (Join-Path $PSScriptRoot 'package-windows.ps1')

