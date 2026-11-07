$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$version=(Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json).version
Set-Location -LiteralPath $projectRoot
$runStarted=Get-Date
$collector=Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"'+(Join-Path $PSScriptRoot 'collect-hardware-qa.cjs')+'"') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot 'verification/compat-native-collector.log') -RedirectStandardError (Join-Path $projectRoot 'verification/compat-native-collector-error.log')
$appProcess=$null
$previousProfile=$env:WEBVIEW2_USER_DATA_FOLDER
$previousEndpoint=$env:RIFTVOICE_QA_RESULT_URL
try{
  $endpointFile=Join-Path $projectRoot 'verification/compat-native-qa-endpoint.private.json'
  $endpoint=$null
  for($attempt=0;$attempt -lt 40;$attempt++){
    if((Test-Path -LiteralPath $endpointFile) -and (Get-Item -LiteralPath $endpointFile).LastWriteTime -ge $runStarted){$endpoint=Get-Content -Raw -LiteralPath $endpointFile | ConvertFrom-Json;break}
    if($collector.HasExited){throw 'The local hardware collector did not start'}
    Start-Sleep -Milliseconds 250
  }
  if(-not $endpoint){throw 'Hardware collector startup timed out'}
  $env:RIFTVOICE_QA_RESULT_URL=$endpoint.resultUrl
  $config=@{productName='Voxdria Hardware QA';identifier='com.riftvoice.hardwareqa';build=@{frontendDist='../verification/native-qa-dist';devUrl=$null;beforeBuildCommand='node scripts/build-hardware-qa.cjs'};app=@{windows=@(@{label='caster';title='Voxdria Hardware QA';url='hardware/index.html';width=720;height=700;visible=$true;focus=$false;additionalBrowserArgs='--autoplay-policy=no-user-gesture-required --disable-background-timer-throttling'})}}
  $configFile=Join-Path $projectRoot 'verification/compat-native-qa.config.json'
  [IO.File]::WriteAllText($configFile,($config | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
  & npx tauri build --no-bundle --features custom-protocol --config $configFile
  if($LASTEXITCODE -ne 0){throw 'Hardware QA build failed'}
  $binary=Join-Path $projectRoot ('verification/Voxdria-hardware-qa-'+$version+'.exe')
  Copy-Item -LiteralPath (Join-Path $projectRoot 'src-tauri/target/release/voxdria.exe') -Destination $binary -Force
  $env:WEBVIEW2_USER_DATA_FOLDER=Join-Path $projectRoot ('verification/native-profile-'+$endpoint.runId)
  $appProcess=Start-Process -FilePath $binary -WindowStyle Hidden -PassThru
  $resultFile=Join-Path $projectRoot 'verification/compat-native-hardware-result.json'
  $result=$null
  for($attempt=0;$attempt -lt 120;$attempt++){
    if(Test-Path -LiteralPath $resultFile){$candidate=Get-Content -Raw -LiteralPath $resultFile | ConvertFrom-Json;if($candidate.runId -eq $endpoint.runId){$result=$candidate;break}}
    if($appProcess.HasExited){throw 'Hardware QA application exited before reporting'}
    Start-Sleep -Milliseconds 500
  }
  if(-not $result){throw 'Hardware QA did not return a result'}
  if(-not $result.passed){throw 'Hardware QA found a device or permission failure; inspect the local report'}
  Write-Output 'Native hardware QA passed: devices, local microphone analysis, app audio and caster permissions.'
}finally{
  if($appProcess -and -not $appProcess.HasExited){Stop-Process -Id $appProcess.Id -ErrorAction SilentlyContinue}
  if(-not $collector.HasExited){Stop-Process -Id $collector.Id -ErrorAction SilentlyContinue}
  $env:WEBVIEW2_USER_DATA_FOLDER=$previousProfile
  $env:RIFTVOICE_QA_RESULT_URL=$previousEndpoint
}
