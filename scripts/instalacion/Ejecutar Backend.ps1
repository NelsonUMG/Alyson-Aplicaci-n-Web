$ErrorActionPreference='Stop'
$raiz=Split-Path -Parent $PSScriptRoot
$archivo=Join-Path $raiz 'configuracion\equipo.dpapi'
if(-not(Test-Path -LiteralPath $archivo)){throw 'No existe la configuración. Ejecuta primero Instalar.cmd.'}
Add-Type -AssemblyName System.Security
$json=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String((Get-Content -Raw -LiteralPath $archivo)),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
$config=$json|ConvertFrom-Json
foreach($p in $config.PSObject.Properties){[Environment]::SetEnvironmentVariable($p.Name,[string]$p.Value,'Process')}
$env:SERVER_SERVLET_SESSION_COOKIE_SECURE='false'
$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')
Write-Host 'Iniciando backend con SQL y Gmail SMTP en http://127.0.0.1:8080'
$candidatos=@((Join-Path $raiz 'runtime\java\bin\java.exe'));$comandoJava=Get-Command java.exe -ErrorAction SilentlyContinue;if($comandoJava){$candidatos+=$comandoJava.Source}
foreach($base in @((Join-Path $env:ProgramFiles 'Eclipse Adoptium'),(Join-Path $env:ProgramFiles 'Microsoft'),(Join-Path $env:ProgramFiles 'Java'))){
    if(-not(Test-Path -LiteralPath $base)){continue}
    $candidatos+=Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue|Sort-Object Name -Descending|ForEach-Object{Join-Path $_.FullName 'bin\java.exe'}|Where-Object{Test-Path -LiteralPath $_}
}
$java=$null
foreach($candidato in @($candidatos|Select-Object -Unique)){try{$version=& $candidato -version 2>&1|Out-String;if($version -match 'version\s+"(?<mayor>\d+)' -and [int]$Matches.mayor -ge 21){$java=$candidato;break}}catch{}}
if(-not $java){throw 'No se encontró Java. Ejecuta nuevamente Instalar.cmd.'}
& $java -jar (Join-Path $raiz 'backend\servidor.jar')
