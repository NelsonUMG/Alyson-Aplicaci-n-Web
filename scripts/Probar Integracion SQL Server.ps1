[CmdletBinding()]
param(
    [Parameter()]
    [string]$InstanciaServidor = 'localhost',

    [Parameter()]
    [int]$PuertoSqlServer = 1433
)

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$sufijo = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$nombreBase = "PruebaFlyway$sufijo"
$nombreUsuario = "pruebaflyway$sufijo"
$contrasena = 'PruebaSegura2026Aa9'
$puerto = Get-Random -Minimum 20000 -Maximum 30000
$archivoSalida = [System.IO.Path]::GetTempFileName()
$archivoErrores = [System.IO.Path]::GetTempFileName()
$procesoServidor = $null
$cadenaPrincipal = "Server=$InstanciaServidor;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
$conexionPrincipal = [System.Data.SqlClient.SqlConnection]::new($cadenaPrincipal)

try {
    $clienteTcp = [System.Net.Sockets.TcpClient]::new()
    try {
        $conexionTcp = $clienteTcp.ConnectAsync($InstanciaServidor, $PuertoSqlServer)
        $puertoDisponible = $false
        try {
            $puertoDisponible = $conexionTcp.Wait(2000) -and $clienteTcp.Connected
        }
        catch {
            $puertoDisponible = $false
        }

        if (-not $puertoDisponible) {
            throw "SQL Server no acepta TCP en $InstanciaServidor`:$PuertoSqlServer. Habilita TCP/IP antes de ejecutar esta prueba."
        }
    }
    finally {
        $clienteTcp.Dispose()
    }

    $conexionPrincipal.Open()
    $comando = $conexionPrincipal.CreateCommand()
    $comando.CommandText = @"
CREATE DATABASE [$nombreBase];
CREATE LOGIN [$nombreUsuario] WITH PASSWORD = N'$contrasena', CHECK_POLICY = OFF;
"@
    [void]$comando.ExecuteNonQuery()

    $cadenaBase = "Server=$InstanciaServidor;Database=$nombreBase;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
    $conexionBase = [System.Data.SqlClient.SqlConnection]::new($cadenaBase)
    try {
        $conexionBase.Open()
        $prepararUsuario = $conexionBase.CreateCommand()
        $prepararUsuario.CommandText = @"
CREATE USER [$nombreUsuario] FOR LOGIN [$nombreUsuario] WITH DEFAULT_SCHEMA = dbo;
ALTER ROLE db_owner ADD MEMBER [$nombreUsuario];
"@
        [void]$prepararUsuario.ExecuteNonQuery()
    }
    finally {
        if ($conexionBase.State -ne [System.Data.ConnectionState]::Closed) {
            $conexionBase.Close()
        }
        $conexionBase.Dispose()
    }

    $env:BDSERVIDOR = $InstanciaServidor
    $env:BDPUERTO = [string]$PuertoSqlServer
    $env:BDNOMBRE = $nombreBase
    $env:BDUSUARIO = $nombreUsuario
    $env:BDCONTRASENA = $contrasena
    $env:BDUSUARIOMIGRACION = $nombreUsuario
    $env:BDCONTRASENAMIGRACION = $contrasena
    $env:BDCIFRAR = 'true'
    $env:BDCONFIARCERTIFICADOSERVIDOR = 'true'
    $env:PUERTOSERVIDOR = [string]$puerto

    $rutaJar = Join-Path $raizRepositorio 'backend\target\servidor-0.0.1-SNAPSHOT.jar'
    if (-not (Test-Path -LiteralPath $rutaJar -PathType Leaf)) {
        throw "No se encontró el servidor compilado en: $rutaJar"
    }

    $procesoServidor = Start-Process `
        -FilePath 'java' `
        -ArgumentList @('-jar', "`"$rutaJar`"") `
        -RedirectStandardOutput $archivoSalida `
        -RedirectStandardError $archivoErrores `
        -WindowStyle Hidden `
        -PassThru

    $respuesta = $null
    for ($intento = 1; $intento -le 40; $intento++) {
        if ($procesoServidor.HasExited) {
            break
        }

        try {
            $respuesta = Invoke-RestMethod `
                -Uri "http://127.0.0.1:$puerto/api/v1/sistema/estado" `
                -TimeoutSec 2
            break
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }

    if ($null -eq $respuesta) {
        Write-Host 'Salida del servidor:'
        Get-Content -LiteralPath $archivoSalida -Tail 80
        Write-Host 'Errores del servidor:'
        Get-Content -LiteralPath $archivoErrores -Tail 80
        throw 'El servidor no inició con Flyway y la base temporal.'
    }

    $conexionConsulta = [System.Data.SqlClient.SqlConnection]::new($cadenaBase)
    try {
        $conexionConsulta.Open()
        $consultaResumen = $conexionConsulta.CreateCommand()
        $consultaResumen.CommandText = @"
SELECT
    (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0 AND name <> 'HistorialMigraciones') AS Tablas,
    (SELECT COUNT(*) FROM dbo.Roles) AS Roles,
    (SELECT COUNT(*) FROM dbo.Permisos) AS Permisos,
    (SELECT COUNT(*) FROM dbo.HistorialMigraciones WHERE success = 1) AS Migraciones;
"@
        $lector = $consultaResumen.ExecuteReader()
        [void]$lector.Read()
        Write-Host "API: $($respuesta.estado), servicio $($respuesta.servicio), versión $($respuesta.versionApi)"
        Write-Host "Flyway: $($lector['Migraciones']) migraciones, $($lector['Tablas']) tablas, $($lector['Roles']) roles, $($lector['Permisos']) permisos"
        $lector.Close()
    }
    finally {
        if ($conexionConsulta.State -ne [System.Data.ConnectionState]::Closed) {
            $conexionConsulta.Close()
        }
        $conexionConsulta.Dispose()
    }
}
finally {
    if ($null -ne $procesoServidor -and -not $procesoServidor.HasExited) {
        Stop-Process -Id $procesoServidor.Id -Force
        $procesoServidor.WaitForExit()
    }

    if ($conexionPrincipal.State -ne [System.Data.ConnectionState]::Open) {
        $conexionPrincipal.Open()
    }

    $limpiar = $conexionPrincipal.CreateCommand()
    $limpiar.CommandText = @"
IF DB_ID(N'$nombreBase') IS NOT NULL
BEGIN
    ALTER DATABASE [$nombreBase] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$nombreBase];
END;
IF SUSER_ID(N'$nombreUsuario') IS NOT NULL
    DROP LOGIN [$nombreUsuario];
"@
    [void]$limpiar.ExecuteNonQuery()
    $conexionPrincipal.Close()
    $conexionPrincipal.Dispose()

    foreach ($archivoTemporal in @($archivoSalida, $archivoErrores)) {
        $rutaTemporal = [System.IO.Path]::GetFullPath($archivoTemporal)
        $carpetaTemporal = [System.IO.Path]::GetTempPath()
        if ($rutaTemporal.StartsWith($carpetaTemporal, [System.StringComparison]::OrdinalIgnoreCase) -and
            (Test-Path -LiteralPath $rutaTemporal)) {
            Remove-Item -LiteralPath $rutaTemporal -Force
        }
    }

    Write-Host "Prueba temporal eliminada: $nombreBase"
}
