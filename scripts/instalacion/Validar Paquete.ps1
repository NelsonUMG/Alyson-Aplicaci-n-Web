[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$raiz=Split-Path -Parent $PSScriptRoot
Write-Host "Validando el sistema en: $raiz"
if(-not [Environment]::Is64BitOperatingSystem){throw 'SQL Server 2025 requiere Windows de 64 bits.'}
$requeridos=@('Instalar.cmd','Iniciar.cmd','Detener.cmd','Backend.cmd','Frontend.cmd','backend\servidor.jar','frontend\index.html','respaldo\RevisionParqueLocal.bak','configuracion\correo.exportado.json','configuracion\clave-instalacion.txt','MANIFIESTO-SHA256.txt')
foreach($rel in $requeridos){if(-not(Test-Path -LiteralPath (Join-Path $raiz $rel))){throw "Falta el archivo requerido: $rel"}}
$errores=@();Get-ChildItem $PSScriptRoot -Filter '*.ps1'|ForEach-Object{$tokens=$null;$fallas=$null;[void][Management.Automation.Language.Parser]::ParseFile($_.FullName,[ref]$tokens,[ref]$fallas);if($fallas){$errores+=$fallas}}
if($errores){throw ('Hay errores de sintaxis en los scripts: '+(($errores|ForEach-Object Message)-join '; '))}
foreach($linea in Get-Content -LiteralPath (Join-Path $raiz 'MANIFIESTO-SHA256.txt')){$partes=$linea -split '  ',2;if($partes.Count -ne 2){throw 'El manifiesto tiene un formato inválido.'};$archivo=Join-Path $raiz $partes[1];if(-not(Test-Path -LiteralPath $archivo) -or (Get-FileHash -LiteralPath $archivo -Algorithm SHA256).Hash -ne $partes[0]){throw "Archivo ausente o alterado: $($partes[1])"}}
$unidad=(Get-Item $raiz).PSDrive;$libre=$unidad.Free;if($libre -lt 6GB){throw 'Se requieren al menos 6 GB libres en la unidad del sistema.'}
. (Join-Path $PSScriptRoot 'Proteccion Configuracion.ps1')
$clave=(Get-Content -Raw -LiteralPath (Join-Path $raiz 'configuracion\clave-instalacion.txt')).Trim()
try{$smtp=DesprotegerConfiguracion (Get-Content -Raw -LiteralPath (Join-Path $raiz 'configuracion\correo.exportado.json')) $clave|ConvertFrom-Json;if($smtp.usuario -ne 'notific.parqueerickbarrondo@gmail.com' -or ([string]$smtp.clave).Length -ne 16){throw 'La configuración Gmail SMTP no es válida.'}}finally{$smtp=$null;$clave=$null}
foreach($puerto in @(8080,5173,15333)){if(Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue){Write-Warning "El puerto $puerto está ocupado; deberá liberarse antes de instalar o iniciar."}}
Write-Host ''
Write-Host 'PAQUETE VÁLIDO: rutas, archivos, hashes, scripts y configuración SMTP comprobados.' -ForegroundColor Green
Write-Host 'Esta validación no instala ni modifica SQL Server.'
