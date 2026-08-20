[CmdletBinding()]
param(
    [switch]$OmitirVerificacionAdministrador,
    [switch]$HabilitarCorreoGmail,
    [switch]$GuardarCredencialCorreoGmail,
    [switch]$DeshabilitarCorreoGmail
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security -ErrorAction Stop
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$rutaJar = Join-Path $raizRepositorio 'backend\target\servidor-0.0.1-SNAPSHOT.jar'
$rutaBackend = Join-Path $raizRepositorio 'backend'
$rutaFrontend = Join-Path $raizRepositorio 'frontend'
$rutaDatos = 'C:\Users\Nelson\Desktop\Proyecto de Alyson Vannesa\Datos Revision Parque'
$rutaRegistro = Join-Path $env:TEMP 'parque-erick-barrondo-ejecucion.json'
$marcaTiempo = Get-Date -Format 'yyyyMMddHHmmss'
$nombreBaseDatos = 'RevisionParqueLocal'
$nombreLoginSql = 'revisionparquelocal'
$correoAdministrador = 'administrador.revision@parque.local'
$correoNoReply = 'notific.parqueerickbarrondo@gmail.com'
$directorioCredencialCorreo = Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo'
$rutaCredencialCorreo = Join-Path $directorioCredencialCorreo 'correo-gmail.dpapi'
$entropiaCredencialCorreo = [Text.Encoding]::UTF8.GetBytes('ParqueErickBarrondo.CorreoGmail.v1')
$contrasenaAplicacionCorreo = $null
$contrasenaAdministrador = if (Test-Path -LiteralPath $rutaRegistro -PathType Leaf) {
    try {
        $registroAnterior = Get-Content -Raw -LiteralPath $rutaRegistro | ConvertFrom-Json
        if ([string]::IsNullOrWhiteSpace($registroAnterior.contrasenaAdministrador)) {
            throw 'El registro anterior no contiene la contraseña administrativa.'
        }
        $registroAnterior.contrasenaAdministrador
    }
    catch {
        "Revision-$([Guid]::NewGuid().ToString('N').Substring(0, 16))Aa9!"
    }
}
else {
    "Revision-$([Guid]::NewGuid().ToString('N').Substring(0, 16))Aa9!"
}
$archivoBackendSalida = Join-Path $env:TEMP "parque-backend-$marcaTiempo.log"
$archivoBackendErrores = Join-Path $env:TEMP "parque-backend-$marcaTiempo.err.log"
$archivoFrontendSalida = Join-Path $env:TEMP "parque-frontend-$marcaTiempo.log"
$archivoFrontendErrores = Join-Path $env:TEMP "parque-frontend-$marcaTiempo.err.log"
$procesoBackend = $null
$procesoFrontend = $null

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

function ConvertirContrasenaSeguraEnTexto {
    param([Security.SecureString]$ClaveSegura)

    $punteroClave = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ClaveSegura)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($punteroClave).Replace(' ', '')
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($punteroClave)
    }
}

function GuardarContrasenaAplicacionCorreo {
    $claveSegura = Read-Host 'Ingresa la contraseña de aplicación de Gmail (no se mostrará)' -AsSecureString
    try {
        $clave = ConvertirContrasenaSeguraEnTexto -ClaveSegura $claveSegura
        if ($clave.Length -ne 16) {
            throw 'La contraseña de aplicación de Gmail debe contener exactamente 16 caracteres.'
        }
        [void](New-Item -ItemType Directory -Path $directorioCredencialCorreo -Force)
        $bytesClave = [Text.Encoding]::UTF8.GetBytes($clave)
        $bytesProtegidos = $null
        try {
            $bytesProtegidos = [Security.Cryptography.ProtectedData]::Protect(
                $bytesClave,
                $entropiaCredencialCorreo,
                [Security.Cryptography.DataProtectionScope]::CurrentUser)
            [Convert]::ToBase64String($bytesProtegidos) |
                Set-Content -LiteralPath $rutaCredencialCorreo -Encoding UTF8
        }
        finally {
            [Array]::Clear($bytesClave, 0, $bytesClave.Length)
            if ($null -ne $bytesProtegidos) {
                [Array]::Clear($bytesProtegidos, 0, $bytesProtegidos.Length)
            }
        }
        return $clave
    }
    finally {
        $claveSegura.Dispose()
    }
}

function ObtenerContrasenaAplicacionCorreo {
    if (-not (Test-Path -LiteralPath $rutaCredencialCorreo -PathType Leaf)) {
        return GuardarContrasenaAplicacionCorreo
    }

    try {
        $bytesProtegidos = [Convert]::FromBase64String(
            (Get-Content -Raw -LiteralPath $rutaCredencialCorreo).Trim())
        $bytesClave = $null
        try {
            $bytesClave = [Security.Cryptography.ProtectedData]::Unprotect(
                $bytesProtegidos,
                $entropiaCredencialCorreo,
                [Security.Cryptography.DataProtectionScope]::CurrentUser)
            $clave = [Text.Encoding]::UTF8.GetString($bytesClave).Replace(' ', '')
            if ($clave.Length -ne 16) {
                throw 'La credencial guardada no contiene una contraseña de aplicación válida.'
            }
            return $clave
        }
        finally {
            [Array]::Clear($bytesProtegidos, 0, $bytesProtegidos.Length)
            if ($null -ne $bytesClave) {
                [Array]::Clear($bytesClave, 0, $bytesClave.Length)
            }
        }
    }
    catch {
        throw 'No fue posible descifrar la credencial de Gmail. Ejecute el script con -GuardarCredencialCorreoGmail para reemplazarla.'
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

if ($HabilitarCorreoGmail -and $DeshabilitarCorreoGmail) {
    throw 'No puedes habilitar y deshabilitar Gmail al mismo tiempo.'
}

if ($GuardarCredencialCorreoGmail) {
    try {
        $contrasenaAplicacionCorreo = GuardarContrasenaAplicacionCorreo
        $contrasenaVerificadaCorreo = ObtenerContrasenaAplicacionCorreo
        if ($contrasenaVerificadaCorreo -cne $contrasenaAplicacionCorreo) {
            throw 'La comprobación de la credencial cifrada no coincidió con la contraseña ingresada.'
        }
        Write-Host 'Credencial de Gmail guardada y cifrada para el usuario actual de Windows.'
        Write-Host 'Los próximos arranques habilitarán Gmail automáticamente.'
    }
    finally {
        $contrasenaAplicacionCorreo = $null
        $contrasenaVerificadaCorreo = $null
    }
    return
}

$usarCorreoGmail = -not $DeshabilitarCorreoGmail -and
    ($HabilitarCorreoGmail -or (Test-Path -LiteralPath $rutaCredencialCorreo -PathType Leaf))

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
if ($usarCorreoGmail) {
    $contrasenaAplicacionCorreo = ObtenerContrasenaAplicacionCorreo
}
$contrasenaSql = NuevaContrasenaSql
$conexionPrincipal = [System.Data.SqlClient.SqlConnection]::new(
    'Server=localhost;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;')

try {
    $conexionPrincipal.Open()
    $crearObjetos = $conexionPrincipal.CreateCommand()
    $crearObjetos.CommandText = @"
IF DB_ID('$nombreBaseDatos') IS NULL CREATE DATABASE [$nombreBaseDatos];
IF SUSER_ID('$nombreLoginSql') IS NULL
    CREATE LOGIN [$nombreLoginSql] WITH PASSWORD = N'$contrasenaSql', CHECK_POLICY = OFF;
ELSE
    ALTER LOGIN [$nombreLoginSql] WITH PASSWORD = N'$contrasenaSql';
"@
    [void]$crearObjetos.ExecuteNonQuery()

    $conexionPrincipal.ChangeDatabase($nombreBaseDatos)
    $crearUsuario = $conexionPrincipal.CreateCommand()
    $crearUsuario.CommandText = @"
IF USER_ID('$nombreLoginSql') IS NULL
    CREATE USER [$nombreLoginSql] FOR LOGIN [$nombreLoginSql] WITH DEFAULT_SCHEMA = dbo;
ELSE
    ALTER USER [$nombreLoginSql] WITH LOGIN = [$nombreLoginSql];
IF IS_ROLEMEMBER('db_owner', '$nombreLoginSql') <> 1
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
    $env:SERVER_ADDRESS = '127.0.0.1'
    $env:SEGURIDADCLAVEHUELLAS = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $env:ADMININICIALHABILITADO = if ($OmitirVerificacionAdministrador) { 'false' } else { 'true' }
    $env:ADMININICIALCORREO = $correoAdministrador
    $env:ADMININICIALNOMBRE = 'Administrador'
    $env:ADMININICIALAPELLIDO = 'Revision'
    $env:ADMININICIALCONTRASENA = $contrasenaAdministrador
    $env:ALMACENAMIENTORUTAPUBLICACIONES = Join-Path $rutaDatos 'publicaciones'
    $env:ALMACENAMIENTORUTAEVENTOS = Join-Path $rutaDatos 'eventos'
    $env:ALMACENAMIENTORUTAAREAS = Join-Path $rutaDatos 'areas'
    $env:ALMACENAMIENTORUTASOLICITUDES = Join-Path $rutaDatos 'solicitudes'
    $env:CORREOENVIOHABILITADO = if ($usarCorreoGmail) { 'true' } else { 'false' }
    if ($usarCorreoGmail) {
        $env:CORREOSMTPHOST = 'smtp.gmail.com'
        $env:CORREOSMTPPUERTO = '587'
        $env:CORREONOREPLY = $correoNoReply
        $env:CORREOCLAVEAPLICACION = $contrasenaAplicacionCorreo
        $env:URLPUBLICAFRONTEND = 'http://127.0.0.1:5173'
    }
    else {
        Remove-Item Env:CORREOCLAVEAPLICACION -ErrorAction SilentlyContinue
    }

    $rutaJava = if ($env:JAVA_HOME) {
        Join-Path $env:JAVA_HOME 'bin\java.exe'
    }
    else {
        (Get-Command java.exe -ErrorAction Stop).Source
    }
    $rutaNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $procesoBackend = Start-Process `
        -FilePath $rutaJava `
        -ArgumentList @('-jar', ('"{0}"' -f $rutaJar)) `
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

    if ($usarCorreoGmail) {
        try {
            $saludServicios = Invoke-RestMethod `
                -Uri 'http://127.0.0.1:8080/actuator/health' `
                -TimeoutSec 20
            if ($saludServicios.status -ne 'UP') {
                throw "El estado de los servicios es $($saludServicios.status)."
            }
        }
        catch {
            throw 'Gmail SMTP rechazó la conexión. Verifica el correo y utiliza una contraseña de aplicación nueva de 16 caracteres.'
        }
    }

    $inicioSesionVerificado = [bool]$OmitirVerificacionAdministrador
    $detalleErrorInicioSesion = $null
    for ($intento = 1; $intento -le 20 -and -not $inicioSesionVerificado; $intento++) {
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
                mantenerSesionActiva = $false
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
            $detalleErrorInicioSesion = $_.Exception.Message
            if ($_.ErrorDetails.Message) {
                $detalleErrorInicioSesion = $_.ErrorDetails.Message
            }
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $inicioSesionVerificado) {
        throw "No fue posible verificar el administrador de revisión. $detalleErrorInicioSesion"
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
        correoAdministrador = if ($OmitirVerificacionAdministrador) { $null } else { $correoAdministrador }
        contrasenaAdministrador = if ($OmitirVerificacionAdministrador) { $null } else { $contrasenaAdministrador }
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
    if (-not $OmitirVerificacionAdministrador) {
        Write-Host "Correo: $correoAdministrador"
        Write-Host "Contraseña: $contrasenaAdministrador"
    }
    Write-Host "Backend PID: $($procesoBackend.Id)"
    Write-Host "Frontend PID: $($procesoFrontend.Id)"
    Write-Host "Correo real: $(if ($usarCorreoGmail) { 'habilitado con Gmail SMTP' } else { 'deshabilitado (modo local)' })"
    if ($usarCorreoGmail) {
        Write-Host 'Credencial Gmail: protegida con Windows DPAPI.'
    }
}
catch {
    if ($null -ne $procesoFrontend -and -not $procesoFrontend.HasExited) {
        Stop-Process -Id $procesoFrontend.Id -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $procesoBackend -and -not $procesoBackend.HasExited) {
        Stop-Process -Id $procesoBackend.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
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
    Remove-Item Env:CORREOCLAVEAPLICACION -ErrorAction SilentlyContinue
    $contrasenaAplicacionCorreo = $null
    $contrasenaSql = $null
}
