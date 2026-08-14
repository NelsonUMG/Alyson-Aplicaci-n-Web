[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$rutaPublicacion = Join-Path $env:LOCALAPPDATA 'ParqueErickBarrondo\PublicacionTemporal'
$rutaEstadoPublicacion = Join-Path $rutaPublicacion 'estado.json'

if (-not (Test-Path -LiteralPath $rutaEstadoPublicacion -PathType Leaf)) {
    Write-Host 'La publicación temporal ya está cerrada.' -ForegroundColor Green
    return
}

$estado = Get-Content -Raw -LiteralPath $rutaEstadoPublicacion | ConvertFrom-Json
$procesoTunel = Get-Process -Id $estado.cloudflaredPid -ErrorAction SilentlyContinue
if ($procesoTunel -and $procesoTunel.ProcessName -eq 'cloudflared') {
    Stop-Process -Id $procesoTunel.Id -Force
    [void]$procesoTunel.WaitForExit(5000)
}

$procesoCaddy = Get-Process -Id $estado.caddyPid -ErrorAction SilentlyContinue
if ($procesoCaddy -and $procesoCaddy.ProcessName -eq 'caddy') {
    Stop-Process -Id $procesoCaddy.Id -Force
    [void]$procesoCaddy.WaitForExit(5000)
}

Remove-Item -LiteralPath $rutaEstadoPublicacion -Force

Write-Host 'La publicación temporal está cerrada.' -ForegroundColor Green
Write-Host "El enlace $($estado.url) dejó de funcionar."
Write-Host 'El sistema local y sus datos permanecen intactos.'
