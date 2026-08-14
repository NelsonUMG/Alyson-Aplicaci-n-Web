[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$rutaBackend = Join-Path $raizRepositorio 'backend'
$rutaFrontend = Join-Path $raizRepositorio 'frontend'
$rutaInicioLocal = Join-Path $PSScriptRoot 'Iniciar Revision Local.ps1'
$rutaPublicacion = Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\PublicacionTemporal'
$rutaCaddyfile = Join-Path $rutaPublicacion 'Caddyfile'
$rutaEstadoPublicacion = Join-Path $rutaPublicacion 'estado.json'
$rutaSalidaCaddy = Join-Path $rutaPublicacion 'caddy.log'
$rutaErroresCaddy = Join-Path $rutaPublicacion 'caddy-error.log'
$rutaSalidaTunel = Join-Path $rutaPublicacion 'cloudflared.log'
$rutaErroresTunel = Join-Path $rutaPublicacion 'cloudflared-error.log'
$procesoCaddy = $null
$procesoTunel = $null

function BuscarEjecutableWinget {
    param(
        [string]$Nombre,
        [string]$IdPaquete
    )

    $comando = Get-Command "$Nombre.exe" -ErrorAction SilentlyContinue
    if ($comando) {
        return $comando.Source
    }

    $enlaceWinget = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\$Nombre.exe"
    if (Test-Path -LiteralPath $enlaceWinget -PathType Leaf) {
        return $enlaceWinget
    }

    $patronPaquete = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\$($IdPaquete)_*\$Nombre.exe"
    $paqueteWinget = Get-ChildItem -Path $patronPaquete -File -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($paqueteWinget) {
        return $paqueteWinget.FullName
    }

    throw "$Nombre no está instalado."
}

function ProbarPuertoLibre {
    param([int]$Puerto)

    $escucha = Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($escucha) {
        throw "El puerto local $Puerto ya está ocupado por el proceso $($escucha.OwningProcess)."
    }
}

function ObtenerEstadoApi {
    param([string]$Url = 'http://127.0.0.1:8080/api/v1/sistema/estado')

    try {
        $respuesta = Invoke-RestMethod -Uri $Url -TimeoutSec 5
        return $respuesta.estado -eq 'DISPONIBLE'
    }
    catch {
        return $false
    }
}

[void](New-Item -ItemType Directory -Path $rutaPublicacion -Force)

if (Test-Path -LiteralPath $rutaEstadoPublicacion -PathType Leaf) {
    $estadoAnterior = Get-Content -Raw -LiteralPath $rutaEstadoPublicacion | ConvertFrom-Json
    $tunelAnterior = Get-Process -Id $estadoAnterior.cloudflaredPid -ErrorAction SilentlyContinue
    $caddyAnterior = Get-Process -Id $estadoAnterior.caddyPid -ErrorAction SilentlyContinue
    if ($tunelAnterior -and $tunelAnterior.ProcessName -eq 'cloudflared' -and
        $caddyAnterior -and $caddyAnterior.ProcessName -eq 'caddy') {
        Write-Host 'La publicación temporal ya está abierta.' -ForegroundColor Green
        Write-Host "Enlace: $($estadoAnterior.url)"
        try { Set-Clipboard -Value $estadoAnterior.url } catch { }
        return
    }
}

$directorioCloudflared = Join-Path $env:USERPROFILE '.cloudflared'
$configuracionesExistentes = @(
    (Join-Path $directorioCloudflared 'config.yml'),
    (Join-Path $directorioCloudflared 'config.yaml')
) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
if ($configuracionesExistentes) {
    throw "Quick Tunnel no puede iniciarse mientras exista esta configuración: $($configuracionesExistentes -join ', ')"
}

ProbarPuertoLibre -Puerto 4173
$rutaCaddy = BuscarEjecutableWinget -Nombre 'caddy' -IdPaquete 'CaddyServer.Caddy'
$rutaCloudflared = BuscarEjecutableWinget -Nombre 'cloudflared' -IdPaquete 'Cloudflare.cloudflared'

Write-Host 'Compilando el backend con los cambios actuales...'
Push-Location $rutaBackend
try {
    & '.\mvnw.cmd' '-DskipTests' 'package'
    if ($LASTEXITCODE -ne 0) {
        throw 'No fue posible compilar el backend.'
    }
}
finally {
    Pop-Location
}

Write-Host 'Compilando la interfaz...'
Push-Location $rutaFrontend
try {
    & 'npm.cmd' 'run' 'compilar'
    if ($LASTEXITCODE -ne 0) {
        throw 'No fue posible compilar la interfaz.'
    }
}
finally {
    Pop-Location
}

$sistemaLocalIniciado = $false
if (-not (ObtenerEstadoApi)) {
    Write-Host 'Iniciando el servidor y la base de datos local...'
    & $rutaInicioLocal -OmitirVerificacionAdministrador *> $null
    $sistemaLocalIniciado = $true
}

if (-not (ObtenerEstadoApi)) {
    throw 'El backend no está disponible en 127.0.0.1:8080.'
}

$rutaDist = (Join-Path $rutaFrontend 'dist').Replace('\', '/')
$contenidoCaddy = @"
http://:4173 {
    bind 127.0.0.1
    encode zstd gzip

    header {
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "geolocation=(self)"
    }

    handle /api/* {
        reverse_proxy 127.0.0.1:8080 {
            header_down Set-Cookie "(.*)" "`$1; Secure"
        }
    }

    handle {
        root * "$rutaDist"
        try_files {path} /index.html
        file_server
    }
}
"@
$contenidoCaddy | Set-Content -LiteralPath $rutaCaddyfile -Encoding UTF8

& $rutaCaddy validate --config $rutaCaddyfile --adapter caddyfile
if ($LASTEXITCODE -ne 0) {
    throw 'La configuración del servidor web local no es válida.'
}

try {
    $procesoCaddy = Start-Process `
        -FilePath $rutaCaddy `
        -ArgumentList @('run', '--config', ('"{0}"' -f $rutaCaddyfile), '--adapter', 'caddyfile') `
        -WorkingDirectory $rutaPublicacion `
        -RedirectStandardOutput $rutaSalidaCaddy `
        -RedirectStandardError $rutaErroresCaddy `
        -WindowStyle Hidden `
        -PassThru

    $servidorWebDisponible = $false
    for ($intento = 1; $intento -le 30; $intento++) {
        if ($procesoCaddy.HasExited) { break }
        if (ObtenerEstadoApi -Url 'http://127.0.0.1:4173/api/v1/sistema/estado') {
            $servidorWebDisponible = $true
            break
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not $servidorWebDisponible) {
        throw 'Caddy no pudo publicar la aplicación en el puerto local 4173.'
    }

    Remove-Item -LiteralPath $rutaSalidaTunel, $rutaErroresTunel -Force -ErrorAction SilentlyContinue
    $procesoTunel = Start-Process `
        -FilePath $rutaCloudflared `
        -ArgumentList @(
            'tunnel',
            '--no-autoupdate',
            '--url', 'http://127.0.0.1:4173',
            '--loglevel', 'info'
        ) `
        -WorkingDirectory $rutaPublicacion `
        -RedirectStandardOutput $rutaSalidaTunel `
        -RedirectStandardError $rutaErroresTunel `
        -WindowStyle Hidden `
        -PassThru

    $urlTemporal = $null
    for ($intento = 1; $intento -le 60; $intento++) {
        if ($procesoTunel.HasExited) { break }
        $registroTunel = @()
        if (Test-Path -LiteralPath $rutaSalidaTunel) {
            $registroTunel += Get-Content -Raw -LiteralPath $rutaSalidaTunel
        }
        if (Test-Path -LiteralPath $rutaErroresTunel) {
            $registroTunel += Get-Content -Raw -LiteralPath $rutaErroresTunel
        }
        $coincidencia = [regex]::Match(
            ($registroTunel -join [Environment]::NewLine),
            'https://[a-z0-9-]+\.trycloudflare\.com',
            [Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($coincidencia.Success) {
            $urlTemporal = $coincidencia.Value
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $urlTemporal) {
        $detalle = if (Test-Path -LiteralPath $rutaErroresTunel) {
            (Get-Content -LiteralPath $rutaErroresTunel -Tail 30) -join [Environment]::NewLine
        }
        else {
            'cloudflared no generó un registro de errores.'
        }
        throw "Cloudflare no generó el enlace temporal.`n$detalle"
    }

    [ordered]@{
        url = $urlTemporal
        caddyPid = $procesoCaddy.Id
        cloudflaredPid = $procesoTunel.Id
        sistemaLocalIniciado = $sistemaLocalIniciado
        comprobado = $false
        iniciadoEn = (Get-Date).ToString('o')
    } | ConvertTo-Json | Set-Content -LiteralPath $rutaEstadoPublicacion -Encoding UTF8

    Write-Host "Cloudflare generó $urlTemporal; esperando que se active globalmente..."
    $enlaceDisponible = $false
    $urlEstado = "$urlTemporal/api/v1/sistema/estado"
    for ($intento = 1; $intento -le 180; $intento++) {
        if ($procesoTunel.HasExited) { break }
        if (ObtenerEstadoApi -Url $urlEstado) {
            $enlaceDisponible = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $enlaceDisponible) {
        throw "Se generó $urlTemporal, pero no fue posible comprobar la aplicación desde Internet."
    }

    [ordered]@{
        url = $urlTemporal
        caddyPid = $procesoCaddy.Id
        cloudflaredPid = $procesoTunel.Id
        sistemaLocalIniciado = $sistemaLocalIniciado
        comprobado = $true
        iniciadoEn = (Get-Date).ToString('o')
    } | ConvertTo-Json | Set-Content -LiteralPath $rutaEstadoPublicacion -Encoding UTF8

    try { Set-Clipboard -Value $urlTemporal } catch { }
    Write-Host ''
    Write-Host 'Publicación temporal abierta correctamente.' -ForegroundColor Green
    Write-Host "Enlace: $urlTemporal"
    Write-Host 'El enlace también se copió al portapapeles.'
    Write-Host 'Para cerrarlo, ejecuta: scripts\Cerrar Publicacion Temporal.ps1'
}
catch {
    if ($procesoTunel -and -not $procesoTunel.HasExited) {
        Stop-Process -Id $procesoTunel.Id -Force -ErrorAction SilentlyContinue
    }
    if ($procesoCaddy -and -not $procesoCaddy.HasExited) {
        Stop-Process -Id $procesoCaddy.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $rutaEstadoPublicacion -Force -ErrorAction SilentlyContinue
    throw
}
