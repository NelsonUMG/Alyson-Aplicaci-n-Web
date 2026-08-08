[CmdletBinding()]
param(
    [Parameter()]
    [switch]$OmitirIntegracionSql
)

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$rutaInterfaz = Join-Path $raizRepositorio 'frontend'
$rutaServidor = Join-Path $raizRepositorio 'backend'
$rutaMigraciones = Join-Path $raizRepositorio 'database\migrations'

$migracionesEsperadas = @(
    'Migracion1 Crear Esquema Inicial.sql',
    'Migracion2 Crear Identidad Y Roles.sql',
    'Migracion3 Crear Publicaciones.sql',
    'Migracion4 Crear Eventos E Inscripciones.sql',
    'Migracion5 Crear Areas Y Mapa.sql',
    'Migracion6 Crear Bicicletas Y Solicitudes.sql',
    'Migracion7 Agregar Seguridad A Usuarios.sql'
    'Migracion8 Agregar Permiso Estado Bicicletas.sql'
    'Migracion9 Proteger Y Optimizar Auditoria.sql'
    'Migracion10 Crear Reservas Areas.sql'
    'Migracion11 Crear Contenido Institucional.sql'
)

foreach ($migracion in $migracionesEsperadas) {
    if (-not (Test-Path -LiteralPath (Join-Path $rutaMigraciones $migracion) -PathType Leaf)) {
        throw "Falta la migración requerida: $migracion"
    }
}

& (Join-Path $PSScriptRoot 'Revisar Secretos.ps1')

Push-Location $rutaInterfaz
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación reproducible de la interfaz.' }
    npm run revisar
    if ($LASTEXITCODE -ne 0) { throw 'Falló la revisión estática de la interfaz.' }
    npm run probar
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de la interfaz.' }
    npm run compilar
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la interfaz.' }
    npm audit --audit-level=critical
    if ($LASTEXITCODE -ne 0) { throw 'La auditoría de dependencias encontró una vulnerabilidad crítica.' }
}
finally {
    Pop-Location
}

Push-Location $rutaServidor
try {
    .\mvnw.cmd clean verify
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas o el empaquetado del servidor.' }
}
finally {
    Pop-Location
}


if (-not $OmitirIntegracionSql) {
    & (Join-Path $PSScriptRoot 'Probar Integracion SQL Server.ps1')
}

Write-Host 'Verificación completa del sistema finalizada.'
