[CmdletBinding()]
param([switch]$SinAbrirNavegador)
$ErrorActionPreference='Stop'
$raiz=Split-Path -Parent $PSScriptRoot
function Encontrar-Ejecutable([string]$Nombre) {
    $env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')
    $candidatos=@()
    if($Nombre -eq 'java'){$candidatos+=(Join-Path $raiz 'runtime\java\bin\java.exe')}
    if($Nombre -eq 'node'){$candidatos+=(Join-Path $raiz 'runtime\node\node.exe')}
    $comando=Get-Command ($Nombre+'.exe') -ErrorAction SilentlyContinue
    if($comando){$candidatos+=$comando.Source}
    if($Nombre -eq 'node'){$candidato=Join-Path $env:ProgramFiles 'nodejs\node.exe';if(Test-Path -LiteralPath $candidato){$candidatos+=$candidato}}
    if($Nombre -eq 'java'){
        foreach($base in @((Join-Path $env:ProgramFiles 'Eclipse Adoptium'),(Join-Path $env:ProgramFiles 'Microsoft'),(Join-Path $env:ProgramFiles 'Java'))){
            if(-not(Test-Path -LiteralPath $base)){continue}
            $candidatos+=Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue|Sort-Object Name -Descending|ForEach-Object{Join-Path $_.FullName 'bin\java.exe'}|Where-Object{Test-Path -LiteralPath $_}
        }
    }
    foreach($candidato in @($candidatos|Select-Object -Unique)){
        try{
            $version=if($Nombre -eq 'java'){& $candidato -version 2>&1|Out-String}else{& $candidato --version 2>&1|Out-String}
            if($Nombre -eq 'java' -and $version -match 'version\s+"(?<mayor>\d+)' -and [int]$Matches.mayor -ge 21){return $candidato}
            if($Nombre -eq 'node' -and $version -match 'v?(?<mayor>\d+)\.' -and [int]$Matches.mayor -ge 18){return $candidato}
        }catch{}
    }
    throw "No se encontró $Nombre. Ejecuta nuevamente Instalar.cmd."
}
Add-Type -AssemblyName System.Security
$archivoConfiguracion=Join-Path $raiz 'configuracion\equipo.dpapi'
if (-not (Test-Path -LiteralPath $archivoConfiguracion)) { throw 'Primero ejecuta Instalar.cmd.' }
$configuracion=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect(
    [Convert]::FromBase64String((Get-Content -Raw -LiteralPath $archivoConfiguracion)), $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser)) | ConvertFrom-Json
foreach ($propiedad in $configuracion.PSObject.Properties) { [Environment]::SetEnvironmentVariable($propiedad.Name,[string]$propiedad.Value,'Process') }
$env:SERVER_SERVLET_SESSION_COOKIE_SECURE='false'
$rutaEstado=Join-Path $raiz 'runtime\estado.json'
if (Test-Path -LiteralPath $rutaEstado) {
    $anterior=Get-Content -Raw -LiteralPath $rutaEstado | ConvertFrom-Json
    $activo=Get-CimInstance Win32_Process -Filter "ProcessId=$($anterior.backendPid)" -ErrorAction SilentlyContinue
    if ($activo -and $activo.CommandLine -like ('*' + (Join-Path $raiz 'backend\servidor.jar') + '*')) {
        try { $salud=Invoke-RestMethod 'http://127.0.0.1:8080/actuator/health' -TimeoutSec 5 } catch { $salud=$null }
        if ($salud.status -eq 'UP') { if (-not $SinAbrirNavegador) { Start-Process $configuracion.URLPUBLICAFRONTEND }; return }
        throw 'Existe un backend activo que requiere revisión. Consulta la carpeta logs.'
    }
}
foreach($puerto in @(8080,5173)) { if (Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue) { throw "El puerto $puerto está ocupado. No se cerrará otro programa." } }
$java=Encontrar-Ejecutable 'java'
$node=Encontrar-Ejecutable 'node'
$marca=Get-Date -Format 'yyyyMMdd-HHmmss'
$backend=$null; $web=$null
try {
    $backend=Start-Process $java -ArgumentList @('-jar',('"{0}"' -f (Join-Path $raiz 'backend\servidor.jar'))) -WorkingDirectory (Join-Path $raiz 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $raiz "logs\backend-$marca.log") -RedirectStandardError (Join-Path $raiz "logs\backend-$marca.err.log")
    $listo=$false
    for ($i=0;$i -lt 120;$i++) {
        if ($backend.HasExited) { break }
        try { $salud=Invoke-RestMethod 'http://127.0.0.1:8080/actuator/health' -TimeoutSec 3; if($salud.status -eq 'UP'){$listo=$true;break} } catch { }
        Start-Sleep -Milliseconds 500
    }
    if(-not $listo){throw 'El backend o SMTP no inició. Consulta los archivos de logs; el correo no se deshabilita automáticamente.'}
    $web=Start-Process $node -ArgumentList ('"{0}"' -f (Join-Path $PSScriptRoot 'Servidor Web.mjs')) -WorkingDirectory $raiz -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $raiz "logs\web-$marca.log") -RedirectStandardError (Join-Path $raiz "logs\web-$marca.err.log")
    $webListo=$false
    for($i=0;$i -lt 30;$i++){try {$respuesta=Invoke-WebRequest 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2; if($respuesta.StatusCode -eq 200){$webListo=$true;break}}catch{};Start-Sleep -Milliseconds 300}
    if(-not $webListo){throw 'La interfaz web no inició.'}
    @{backendPid=$backend.Id;webPid=$web.Id;iniciadoEn=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $rutaEstado -Encoding UTF8
    Write-Host 'Sistema y SMTP activos. Dirección: http://127.0.0.1:5173'
    if(-not $SinAbrirNavegador){Start-Process 'http://127.0.0.1:5173'}
} catch {
    if($web -and -not $web.HasExited){Stop-Process -Id $web.Id -Force}
    if($backend -and -not $backend.HasExited){Stop-Process -Id $backend.Id -Force}
    throw
}
