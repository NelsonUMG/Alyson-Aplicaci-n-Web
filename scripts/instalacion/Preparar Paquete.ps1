[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$DirectorioSalida,
    [Parameter(Mandatory)][string]$RutaRespaldoSql,
    [switch]$OmitirCompilacion
)
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$salida=[IO.Path]::GetFullPath($DirectorioSalida)
$staging=Join-Path $salida 'ParqueErickBarrondo'
function Nueva-Clave([int]$Bytes = 32) {
    $datos=New-Object byte[] $Bytes;$rng=[Security.Cryptography.RandomNumberGenerator]::Create()
    try{$rng.GetBytes($datos)}finally{$rng.Dispose()}
    [Convert]::ToBase64String($datos).TrimEnd('=').Replace('+','A').Replace('/','b')+'!9a'
}
if(Test-Path -LiteralPath $staging){throw "Ya existe el staging: $staging"}
if(-not(Test-Path -LiteralPath $RutaRespaldoSql)){throw 'No se encontró el respaldo SQL indicado.'}
if(-not $OmitirCompilacion){Push-Location (Join-Path $repo 'frontend');try{npm run compilar;if($LASTEXITCODE){throw 'Falló frontend.'}}finally{Pop-Location};Push-Location (Join-Path $repo 'backend');try{.\mvnw.cmd -q -DskipTests package;if($LASTEXITCODE){throw 'Falló backend.'}}finally{Pop-Location}}
$jar=Get-ChildItem (Join-Path $repo 'backend\target') -Filter 'servidor-*.jar' -File|Where-Object Name -NotLike '*.original'|Sort-Object LastWriteTime -Descending|Select-Object -First 1
if(-not $jar){throw 'No se encontró el JAR compilado.'}
foreach($d in @('backend','frontend','scripts','datos','respaldo','configuracion')){New-Item -ItemType Directory -Path (Join-Path $staging $d) -Force|Out-Null}
Copy-Item -LiteralPath $jar.FullName -Destination (Join-Path $staging 'backend\servidor.jar')
Copy-Item -Path (Join-Path $repo 'frontend\dist\*') -Destination (Join-Path $staging 'frontend') -Recurse
Copy-Item -Path 'C:\Users\Nelson\Desktop\Proyecto de Alyson Vannesa\Datos Revision Parque\*' -Destination (Join-Path $staging 'datos') -Recurse
Copy-Item -LiteralPath $RutaRespaldoSql -Destination (Join-Path $staging 'respaldo\RevisionParqueLocal.bak')
foreach($f in @('Proteccion Configuracion.ps1','Servidor Web.mjs','Iniciar Sistema.ps1','Detener Sistema.ps1','Instalar Sistema.ps1','Ejecutar Backend.ps1','Validar Paquete.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $f) -Destination (Join-Path $staging 'scripts')}
foreach($f in @('Instalar.cmd','Iniciar.cmd','Detener.cmd','Backend.cmd','Frontend.cmd','Validar.cmd')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $f) -Destination $staging}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LEEME-INSTALACION.txt') -Destination $staging

$clave=Nueva-Clave 32
$dpapi=Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\correo-gmail.dpapi'
if(-not(Test-Path -LiteralPath $dpapi)){throw 'No existe la credencial Gmail DPAPI de origen.'}
Add-Type -AssemblyName System.Security
$entropy=[Text.Encoding]::UTF8.GetBytes('ParqueErickBarrondo.CorreoGmail.v1')
$secreto=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String((Get-Content -Raw $dpapi)),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser))
. (Join-Path $PSScriptRoot 'Proteccion Configuracion.ps1')
try{$documento=ProtegerConfiguracion (([ordered]@{usuario='notific.parqueerickbarrondo@gmail.com';clave=$secreto}|ConvertTo-Json -Compress)) $clave;[IO.File]::WriteAllText((Join-Path $staging 'configuracion\correo.exportado.json'),$documento,[Text.UTF8Encoding]::new($false))}finally{$secreto=$null}
[IO.File]::WriteAllText((Join-Path $staging 'configuracion\clave-instalacion.txt'),$clave,[Text.UTF8Encoding]::new($false))

$manifiesto=foreach($archivo in Get-ChildItem $staging -File -Recurse|Sort-Object FullName){'{0}  {1}' -f (Get-FileHash $archivo.FullName -Algorithm SHA256).Hash,$archivo.FullName.Substring($staging.Length+1)}
[IO.File]::WriteAllLines((Join-Path $staging 'MANIFIESTO-SHA256.txt'),$manifiesto,[Text.UTF8Encoding]::new($false))
$rar='C:\Program Files\WinRAR\Rar.exe';if(-not(Test-Path $rar)){throw 'WinRAR no está disponible.'}
$archivoRar=Join-Path $salida 'ParqueErickBarrondo-Completo.rar'
Push-Location $salida;try{& $rar a -r -m5 $archivoRar 'ParqueErickBarrondo';if($LASTEXITCODE){throw 'Falló WinRAR.'}; & $rar t $archivoRar;if($LASTEXITCODE){throw 'Falló la prueba del RAR.'}}finally{Pop-Location}
$clave=$null
Get-FileHash $archivoRar -Algorithm SHA256|Format-List;Write-Output $archivoRar
