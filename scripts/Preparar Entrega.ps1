[CmdletBinding()]
param(
    [Parameter()]
    [string]$DirectorioSalida = (Join-Path $env:USERPROFILE 'Desktop\Proyecto de Alyson Vannesa\Entregas'),

    [Parameter()]
    [switch]$OmitirPruebas,

    [Parameter()]
    [switch]$OmitirIntegracionSql
)

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$rutaInterfaz = Join-Path $raizRepositorio 'frontend'
$rutaServidor = Join-Path $raizRepositorio 'backend'

if (-not $OmitirPruebas) {
    & (Join-Path $PSScriptRoot 'Probar Sistema.ps1') -OmitirIntegracionSql:$OmitirIntegracionSql
}
else {
    Push-Location $rutaInterfaz
    try {
        npm run compilar
        if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la interfaz.' }
    }
    finally { Pop-Location }

    Push-Location $rutaServidor
    try {
        .\mvnw.cmd -q -DskipTests package
        if ($LASTEXITCODE -ne 0) { throw 'Falló el empaquetado del servidor.' }
    }
    finally { Pop-Location }
}

$directorioRaizSalida = [System.IO.Path]::GetFullPath($DirectorioSalida)
[void](New-Item -ItemType Directory -Path $directorioRaizSalida -Force)
$marcaTiempo = Get-Date -Format 'yyyyMMdd-HHmmss'
$directorioEntrega = Join-Path $directorioRaizSalida "ParqueErickBarrondo-$marcaTiempo"
[void](New-Item -ItemType Directory -Path $directorioEntrega)
[void](New-Item -ItemType Directory -Path (Join-Path $directorioEntrega 'frontend'))
[void](New-Item -ItemType Directory -Path (Join-Path $directorioEntrega 'backend'))
[void](New-Item -ItemType Directory -Path (Join-Path $directorioEntrega 'configuracion'))
[void](New-Item -ItemType Directory -Path (Join-Path $directorioEntrega 'scripts'))

$jar = Get-ChildItem -LiteralPath (Join-Path $rutaServidor 'target') -Filter 'servidor-*.jar' -File |
    Where-Object { $_.Name -notlike '*.original' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if ($null -eq $jar) { throw 'No se encontró el servidor empaquetado.' }

Copy-Item -Path (Join-Path $rutaInterfaz 'dist\*') -Destination (Join-Path $directorioEntrega 'frontend') -Recurse
Copy-Item -LiteralPath $jar.FullName -Destination (Join-Path $directorioEntrega 'backend\servidor.jar')
Copy-Item -LiteralPath (Join-Path $raizRepositorio '.env.example') -Destination (Join-Path $directorioEntrega 'configuracion\.env.example')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Inicializar SQL Server Local.ps1') -Destination (Join-Path $directorioEntrega 'scripts')

$archivosEntrega = Get-ChildItem -LiteralPath $directorioEntrega -File -Recurse | Sort-Object FullName
$manifiesto = foreach ($archivo in $archivosEntrega) {
    $rutaRelativa = $archivo.FullName.Substring($directorioEntrega.Length + 1)
    $hash = (Get-FileHash -LiteralPath $archivo.FullName -Algorithm SHA256).Hash
    "$hash  $rutaRelativa"
}
$rutaManifiesto = Join-Path $directorioEntrega 'MANIFIESTO-SHA256.txt'
[System.IO.File]::WriteAllLines($rutaManifiesto, $manifiesto, [System.Text.UTF8Encoding]::new($false))

Write-Host "Entrega local preparada fuera del repositorio: $directorioEntrega"
Write-Output $directorioEntrega
