$ErrorActionPreference='Stop'
$raiz=Split-Path -Parent $PSScriptRoot
$rutaEstado=Join-Path $raiz 'runtime\estado.json'
if(-not(Test-Path -LiteralPath $rutaEstado)){Write-Host 'No hay una ejecución registrada.';return}
$estado=Get-Content -Raw -LiteralPath $rutaEstado | ConvertFrom-Json
foreach($elemento in @(@{Id=$estado.backendPid;Archivo=(Join-Path $raiz 'backend\servidor.jar')},@{Id=$estado.webPid;Archivo=(Join-Path $PSScriptRoot 'Servidor Web.mjs')})){
    $proceso=Get-CimInstance Win32_Process -Filter "ProcessId=$($elemento.Id)" -ErrorAction SilentlyContinue
    if($proceso -and $proceso.CommandLine -like ('*'+$elemento.Archivo+'*')){Stop-Process -Id $elemento.Id -Force}
}
Remove-Item -LiteralPath $rutaEstado
Write-Host 'Sistema web detenido. La base de datos se conserva.'
