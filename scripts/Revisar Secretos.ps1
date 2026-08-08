[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command rg -ErrorAction SilentlyContinue)) {
    throw 'No se encontró rg para ejecutar la revisión de secretos.'
}

$patrones = @(
    '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'AKIA[0-9A-Z]{16}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'gh[pousr]_[A-Za-z0-9]{30,}',
    'sk-[A-Za-z0-9_-]{32,}',
    'xox[baprs]-[A-Za-z0-9-]{20,}'
)
$argumentos = @(
    '--hidden',
    '--line-number',
    '--color', 'never',
    '--glob', '!.git/**',
    '--glob', '!frontend/node_modules/**',
    '--glob', '!frontend/dist/**',
    '--glob', '!backend/target/**'
)
foreach ($patron in $patrones) {
    $argumentos += @('-e', $patron)
}
$argumentos += $raizRepositorio

$coincidencias = & rg @argumentos 2>$null
if ($LASTEXITCODE -notin @(0, 1)) {
    throw 'La revisión de secretos no pudo completar la búsqueda.'
}
if ($coincidencias) {
    $coincidencias | Write-Host
    throw 'Se detectaron patrones que pueden corresponder a secretos reales.'
}

$archivosProhibidos = git -C $raizRepositorio ls-files -- '.env' '*.pem' '*.key' '*.p12' '*.jks'
if ($LASTEXITCODE -ne 0) {
    throw 'No fue posible comprobar los archivos versionados.'
}
if ($archivosProhibidos) {
    $archivosProhibidos | Write-Host
    throw 'Hay archivos de secretos incluidos en el seguimiento de Git.'
}

$variablesPublicasSensibles = & rg `
    --hidden `
    --line-number `
    --color never `
    --glob '!.git/**' `
    --glob '!frontend/node_modules/**' `
    --glob '!frontend/dist/**' `
    'VITE_[A-Z0-9_]*(SECRETO|SECRET|TOKEN|CONTRASENA|PASSWORD|CLAVE)' `
    $raizRepositorio 2>$null
if ($LASTEXITCODE -notin @(0, 1)) {
    throw 'No fue posible revisar las variables públicas del frontend.'
}
if ($variablesPublicasSensibles) {
    $variablesPublicasSensibles | Write-Host
    throw 'Una variable VITE_ parece contener material sensible.'
}

Write-Host 'Revisión de secretos: sin patrones de alta confianza ni archivos prohibidos.'
