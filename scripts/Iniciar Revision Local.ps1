[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$rutaJar = Join-Path $raizRepositorio 'backend\target\servidor-0.0.1-SNAPSHOT.jar'
$rutaBackend = Join-Path $raizRepositorio 'backend'
$rutaFrontend = Join-Path $raizRepositorio 'frontend'
$rutaDatos = 'C:\Users\Nelson\Desktop\Proyecto de Alyson Vannesa\Datos Revision Parque'
$rutaRegistro = Join-Path $env:TEMP 'parque-erick-barrondo-ejecucion.json'
$marcaTiempo = Get-Date -Format 'yyyyMMddHHmmss'
$sufijo = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$nombreBaseDatos = "RevisionParque$marcaTiempo"
$nombreLoginSql = "revisionparque$sufijo"
$correoAdministrador = 'administrador.revision@parque.local'
$contrasenaAdministrador = "Revision-$([Guid]::NewGuid().ToString('N').Substring(0, 16))Aa9!"
$archivoBackendSalida = Join-Path $env:TEMP "parque-backend-$marcaTiempo.log"
$archivoBackendErrores = Join-Path $env:TEMP "parque-backend-$marcaTiempo.err.log"
$archivoFrontendSalida = Join-Path $env:TEMP "parque-frontend-$marcaTiempo.log"
$archivoFrontendErrores = Join-Path $env:TEMP "parque-frontend-$marcaTiempo.err.log"
$procesoBackend = $null
$procesoFrontend = $null
$objetosSqlCreados = $false

function NuevaContrasenaSql {
    $bytes = New-Object byte[] 24
    $generador = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generador.GetBytes($bytes)
        return ([BitConverter]::ToString($bytes).Replace('-', '')) + 'Aa9!'
    }
    finally {
        $generador.Dispose()
    }
}

function ProbarPuertoLibre {
    param([int]$Puerto)

    $escucha = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -ne $escucha) {
        throw "El puerto $Puerto ya está ocupado por el proceso $($escucha.OwningProcess)."
    }
}

function MostrarUltimasLineas {
    param([string]$Ruta)

    if (Test-Path -LiteralPath $Ruta -PathType Leaf) {
        Get-Content -LiteralPath $Ruta -Tail 60
    }
}

if (-not (Test-Path -LiteralPath $rutaJar -PathType Leaf)) {
    throw "No se encontró el servidor compilado en: $rutaJar"
}
if (Test-Path -LiteralPath $rutaRegistro -PathType Leaf) {
    $ejecucionAnterior = Get-Content -Raw -LiteralPath $rutaRegistro | ConvertFrom-Json
    $backendAnterior = Get-Process -Id $ejecucionAnterior.backendPid -ErrorAction SilentlyContinue
    $frontendAnterior = Get-Process -Id $ejecucionAnterior.frontendPid -ErrorAction SilentlyContinue
    $backendAnteriorVigente = $null -ne $backendAnterior -and $backendAnterior.ProcessName -eq 'java'
    $frontendAnteriorVigente = $null -ne $frontendAnterior -and
        @('cmd', 'node', 'npm', 'npm-cli') -contains $frontendAnterior.ProcessName
    if ($backendAnteriorVigente -or $frontendAnteriorVigente) {
        throw 'Ya existe una revisión local registrada. Detén esa ejecución antes de iniciar otra.'
    }
}

ProbarPuertoLibre -Puerto 8080
ProbarPuertoLibre -Puerto 5173
$contrasenaSql = NuevaContrasenaSql
$conexionPrincipal = [System.Data.SqlClient.SqlConnection]::new(
    'Server=localhost;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;')

try {
    $conexionPrincipal.Open()
    $crearObjetos = $conexionPrincipal.CreateCommand()
    $crearObjetos.CommandText = @"
CREATE DATABASE [$nombreBaseDatos];
CREATE LOGIN [$nombreLoginSql] WITH PASSWORD = N'$contrasenaSql', CHECK_POLICY = OFF;
"@
    [void]$crearObjetos.ExecuteNonQuery()
    $objetosSqlCreados = $true

    $conexionPrincipal.ChangeDatabase($nombreBaseDatos)
    $crearUsuario = $conexionPrincipal.CreateCommand()
    $crearUsuario.CommandText = @"
CREATE USER [$nombreLoginSql] FOR LOGIN [$nombreLoginSql] WITH DEFAULT_SCHEMA = dbo;
ALTER ROLE db_owner ADD MEMBER [$nombreLoginSql];
"@
    [void]$crearUsuario.ExecuteNonQuery()

    [void](New-Item -ItemType Directory -Path $rutaDatos -Force)
    $env:BDSERVIDOR = 'localhost'
    $env:BDPUERTO = '1433'
    $env:BDNOMBRE = $nombreBaseDatos
    $env:BDUSUARIO = $nombreLoginSql
    $env:BDCONTRASENA = $contrasenaSql
    $env:BDUSUARIOMIGRACION = $nombreLoginSql
    $env:BDCONTRASENAMIGRACION = $contrasenaSql
    $env:BDCIFRAR = 'true'
    $env:BDCONFIARCERTIFICADOSERVIDOR = 'true'
    $env:PUERTOSERVIDOR = '8080'
    $env:SEGURIDADCLAVEHUELLAS = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $env:ADMININICIALHABILITADO = 'true'
    $env:ADMININICIALCORREO = $correoAdministrador
    $env:ADMININICIALNOMBRE = 'Administrador'
    $env:ADMININICIALAPELLIDO = 'Revision'
    $env:ADMININICIALCONTRASENA = $contrasenaAdministrador
    $env:ALMACENAMIENTORUTAPUBLICACIONES = Join-Path $rutaDatos 'publicaciones'
    $env:ALMACENAMIENTORUTAEVENTOS = Join-Path $rutaDatos 'eventos'
    $env:ALMACENAMIENTORUTAAREAS = Join-Path $rutaDatos 'areas'

    $rutaJava = if ($env:JAVA_HOME) {
        Join-Path $env:JAVA_HOME 'bin\java.exe'
    }
    else {
        (Get-Command java.exe -ErrorAction Stop).Source
    }
    $rutaNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $procesoBackend = Start-Process `
        -FilePath $rutaJava `
        -ArgumentList @('-jar', $rutaJar) `
        -WorkingDirectory $rutaBackend `
        -RedirectStandardOutput $archivoBackendSalida `
        -RedirectStandardError $archivoBackendErrores `
        -WindowStyle Hidden `
        -PassThru

    $apiDisponible = $false
    for ($intento = 1; $intento -le 60; $intento++) {
        if ($procesoBackend.HasExited) { break }
        try {
            $estado = Invoke-RestMethod `
                -Uri 'http://127.0.0.1:8080/api/v1/sistema/estado' `
                -TimeoutSec 2
            $apiDisponible = $estado.estado -eq 'DISPONIBLE'
            if ($apiDisponible) { break }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $apiDisponible) {
        throw 'El backend no inició correctamente.'
    }

    $inicioSesionVerificado = $false
    for ($intento = 1; $intento -le 20; $intento++) {
        try {
            $sesionWeb = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
            $csrf = Invoke-RestMethod `
                -Uri 'http://127.0.0.1:8080/api/v1/autenticacion/csrf' `
                -WebSession $sesionWeb `
                -TimeoutSec 3
            $encabezados = @{}
            $encabezados[$csrf.nombreEncabezado] = $csrf.token
            $datosSesion = @{
                correo = $correoAdministrador
                contrasena = $contrasenaAdministrador
            } | ConvertTo-Json
            [void](Invoke-RestMethod `
                -Uri 'http://127.0.0.1:8080/api/v1/autenticacion/iniciar-sesion' `
                -Method Post `
                -ContentType 'application/json' `
                -Headers $encabezados `
                -Body $datosSesion `
                -WebSession $sesionWeb `
                -TimeoutSec 3)
            $inicioSesionVerificado = $true
            break
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $inicioSesionVerificado) {
        throw 'No fue posible verificar el administrador de revisión.'
    }

    $procesoFrontend = Start-Process `
        -FilePath $rutaNpm `
        -ArgumentList @('run', 'desarrollo') `
        -WorkingDirectory $rutaFrontend `
        -RedirectStandardOutput $archivoFrontendSalida `
        -RedirectStandardError $archivoFrontendErrores `
        -WindowStyle Hidden `
        -PassThru
    $interfazDisponible = $false
    for ($intento = 1; $intento -le 30; $intento++) {
        if ($procesoFrontend.HasExited) { break }
        try {
            $respuestaWeb = Invoke-WebRequest `
                -Uri 'http://127.0.0.1:5173' `
                -UseBasicParsing `
                -TimeoutSec 2
            $interfazDisponible = $respuestaWeb.StatusCode -eq 200
            if ($interfazDisponible) { break }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $interfazDisponible) {
        throw 'El frontend no inició correctamente.'
    }
    $estadoProxy = Invoke-RestMethod `
        -Uri 'http://127.0.0.1:5173/api/v1/sistema/estado' `
        -TimeoutSec 5
    if ($estadoProxy.estado -ne 'DISPONIBLE') {
        throw 'El frontend no pudo comunicarse con el backend.'
    }

    $informacion = [ordered]@{
        backendPid = $procesoBackend.Id
        frontendPid = $procesoFrontend.Id
        baseDatos = $nombreBaseDatos
        loginSql = $nombreLoginSql
        correoAdministrador = $correoAdministrador
        contrasenaAdministrador = $contrasenaAdministrador
        backendLog = $archivoBackendSalida
        backendErrorLog = $archivoBackendErrores
        frontendLog = $archivoFrontendSalida
        frontendErrorLog = $archivoFrontendErrores
        iniciadoEn = (Get-Date).ToString('o')
    }
    $informacion | ConvertTo-Json | Set-Content -LiteralPath $rutaRegistro -Encoding UTF8

    Write-Host 'Sistema local listo para revisión.'
    Write-Host 'Interfaz: http://127.0.0.1:5173'
    Write-Host 'API: http://127.0.0.1:8080'
    Write-Host "Correo: $correoAdministrador"
    Write-Host "Contraseña: $contrasenaAdministrador"
    Write-Host "Backend PID: $($procesoBackend.Id)"
    Write-Host "Frontend PID: $($procesoFrontend.Id)"
}
catch {
    if ($null -ne $procesoFrontend -and -not $procesoFrontend.HasExited) {
        Stop-Process -Id $procesoFrontend.Id -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $procesoBackend -and -not $procesoBackend.HasExited) {
        Stop-Process -Id $procesoBackend.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    if ($objetosSqlCreados) {
        try {
            if ($conexionPrincipal.State -ne [System.Data.ConnectionState]::Open) {
                $conexionPrincipal.Open()
            }
            $conexionPrincipal.ChangeDatabase('master')
            $limpiar = $conexionPrincipal.CreateCommand()
            $limpiar.CommandText = @"
IF DB_ID('$nombreBaseDatos') IS NOT NULL
BEGIN
    ALTER DATABASE [$nombreBaseDatos] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$nombreBaseDatos];
END;
IF SUSER_ID('$nombreLoginSql') IS NOT NULL DROP LOGIN [$nombreLoginSql];
"@
            [void]$limpiar.ExecuteNonQuery()
        }
        catch {
            Write-Warning 'No fue posible limpiar todos los objetos temporales de SQL Server.'
        }
    }
    Write-Host 'Salida reciente del backend:'
    MostrarUltimasLineas -Ruta $archivoBackendSalida
    MostrarUltimasLineas -Ruta $archivoBackendErrores
    Write-Host 'Salida reciente del frontend:'
    MostrarUltimasLineas -Ruta $archivoFrontendSalida
    MostrarUltimasLineas -Ruta $archivoFrontendErrores
    throw
}
finally {
    if ($conexionPrincipal.State -ne [System.Data.ConnectionState]::Closed) {
        $conexionPrincipal.Close()
    }
    $conexionPrincipal.Dispose()
    $contrasenaSql = $null
}
