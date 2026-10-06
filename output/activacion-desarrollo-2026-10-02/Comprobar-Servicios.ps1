$ErrorActionPreference = 'Stop'
$ejecucion = Get-Content -Raw -LiteralPath (Join-Path $env:TEMP 'parque-erick-barrondo-ejecucion.json') | ConvertFrom-Json
$publicacion = Get-Content -Raw -LiteralPath (Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\PublicacionTemporal\estado.json') | ConvertFrom-Json
$energia = Get-Content -Raw -LiteralPath (Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\PublicacionTemporal\mantener-activo.json') | ConvertFrom-Json
$resultadosWeb = foreach ($base in @('http://127.0.0.1:5173','http://127.0.0.1:4173',$publicacion.url)) {
    $pagina = Invoke-WebRequest -Uri "$base/mapa" -UseBasicParsing -TimeoutSec 30
    if ($pagina.StatusCode -ne 200 -or $pagina.Content -notmatch '<div id="root">') { throw "Interfaz no disponible: $base" }
    $estado = Invoke-RestMethod -Uri "$base/api/v1/sistema/estado" -TimeoutSec 30
    if ($estado.estado -ne 'DISPONIBLE') { throw "API no disponible: $base" }
    $mapa = Invoke-RestMethod -Uri "$base/api/v1/publico/mapa" -TimeoutSec 30
    if (-not $mapa) { throw "Mapa vacio: $base" }
    [ordered]@{ url = $base; interfaz = 200; api = $estado.estado; mapa = 'respuesta JSON recibida' }
}
$salud = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/actuator/health' -TimeoutSec 30
if ($salud.status -ne 'UP' -or -not $ejecucion.correoSmtpHabilitado) { throw 'La salud del sistema o SMTP no esta confirmada.' }
if ($ejecucion.urlPublicaFrontend -ne $publicacion.url) { throw 'El enlace de correo no coincide con el tunel activo.' }
$procesoEnergia = Get-Process -Id $energia.procesoId -ErrorAction Stop
if ($procesoEnergia.ProcessName -ne 'powershell' -or -not $energia.solicitudWindowsAceptada -or
    ((Get-Date) - [datetime]$energia.ultimaComprobacion).TotalSeconds -gt 90) { throw 'La proteccion contra suspension no esta activa.' }
foreach ($proceso in @(@{id=$publicacion.caddyPid;nombre='caddy'},@{id=$publicacion.cloudflaredPid;nombre='cloudflared'},@{id=$ejecucion.backendPid;nombre='java'})) {
    if ((Get-Process -Id $proceso.id -ErrorAction Stop).ProcessName -ne $proceso.nombre) { throw 'No coincide el proceso registrado.' }
}
$conexion = [Data.SqlClient.SqlConnection]::new('Server=localhost;Database=RevisionParqueLocal;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;')
try {
    $conexion.Open()
    $consulta = $conexion.CreateCommand()
    $consulta.CommandText = "SELECT CAST(SERVERPROPERTY('Edition') AS nvarchar(128));"
    $edicion = $consulta.ExecuteScalar()
    if ($edicion -notmatch 'Developer') { throw 'SQL no esta usando la edicion Developer.' }
    $consulta.CommandText = 'DBCC CHECKDB ([RevisionParqueLocal]) WITH NO_INFOMSGS, ALL_ERRORMSGS;'
    $consulta.CommandTimeout = 120
    $comprobacion = [Data.DataSet]::new()
    $adaptador = [Data.SqlClient.SqlDataAdapter]::new($consulta)
    [void]$adaptador.Fill($comprobacion)
    foreach ($tabla in $comprobacion.Tables) { if ($tabla.Rows.Count -gt 0) { throw 'CHECKDB informo errores; revisar integridad antes de usar la base.' } }
}
finally { $conexion.Dispose() }
$resultado = [ordered]@{
    fecha = (Get-Date).ToString('o')
    uso = 'desarrollo y pruebas'
    sql = $edicion
    baseDatos = 'RevisionParqueLocal'
    integridad = 'CHECKDB sin errores'
    web = $resultadosWeb
    salud = $salud.status
    smtpHabilitado = $ejecucion.correoSmtpHabilitado
    correoUrl = $ejecucion.urlPublicaFrontend
    proteccionSuspension = $true
    backendPid = $ejecucion.backendPid
    frontendPid = $ejecucion.frontendPid
    caddyPid = $publicacion.caddyPid
    cloudflaredPid = $publicacion.cloudflaredPid
    energiaPid = $energia.procesoId
}
$resultado | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'servicios-verificados.json') -Encoding UTF8
$resultado | ConvertTo-Json -Depth 5
