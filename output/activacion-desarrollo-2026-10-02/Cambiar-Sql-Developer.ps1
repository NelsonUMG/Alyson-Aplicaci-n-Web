param([switch]$OmitirComprobacionMotorVencido)
$ErrorActionPreference = 'Stop'
$rutaResultado = Join-Path $PSScriptRoot 'sql-developer-resultado.json'
$resultado = [ordered]@{ estado = 'iniciando'; respaldo = $null; codigoInstalador = $null; error = $null }
try {
    $servicio = Get-Service MSSQLSERVER
    if ($servicio.Status -ne 'Stopped') { throw 'La instancia debe estar detenida antes de copiar sus archivos.' }
    $rutaDatosSql = 'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA'
    $rutaSetup = 'C:\SQL2025\Evaluation_ENU\SETUP.EXE'
    $firma = Get-AuthenticodeSignature -FilePath $rutaSetup
    if ($firma.Status -ne 'Valid' -or $firma.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
        throw 'El instalador no tiene una firma valida de Microsoft.'
    }
    $configuracion = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\Setup'
    if ($configuracion.Edition -ne 'Enterprise Evaluation Edition' -or $configuracion.Version -ne '17.0.1000.7') {
        throw 'La instancia no coincide con la evaluacion SQL Server 2025 revisada.'
    }
    $rutaRespaldo = Join-Path $env:LOCALAPPDATA ('ParqueErickBarrondo\Respaldos\SQL-antes-Developer-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    [void](New-Item -ItemType Directory -Path $rutaRespaldo)
    $resultado.respaldo = $rutaRespaldo
    $archivos = @(Get-ChildItem -LiteralPath $rutaDatosSql -File | Where-Object {
        $_.Extension -in '.mdf', '.ndf', '.ldf' -and $_.Name -notmatch '^temp(db|log|\d+)'
    })
    if (-not ($archivos.Name -contains 'RevisionParqueLocal.mdf')) { throw 'No se encontro la base de datos del sistema en el directorio previsto.' }
    $bytes = ($archivos | Measure-Object Length -Sum).Sum
    if ((Get-PSDrive C).Free -lt ($bytes + 5GB)) { throw 'No hay espacio suficiente para respaldo e instalacion.' }
    $manifiesto = foreach ($archivo in $archivos) {
        $destino = Join-Path $rutaRespaldo $archivo.Name
        Copy-Item -LiteralPath $archivo.FullName -Destination $destino
        $hashOriginal = (Get-FileHash -LiteralPath $archivo.FullName -Algorithm SHA256).Hash
        $hashCopia = (Get-FileHash -LiteralPath $destino -Algorithm SHA256).Hash
        if ($hashOriginal -ne $hashCopia) { throw "La copia no coincide: $($archivo.Name)" }
        [ordered]@{ archivo = $archivo.Name; bytes = $archivo.Length; sha256 = $hashCopia }
    }
    $manifiesto | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $rutaRespaldo 'manifiesto.json') -Encoding UTF8
    & reg.exe export 'HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER' (Join-Path $rutaRespaldo 'instancia.reg') /y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo respaldar la configuracion de la instancia.' }
    $resultado.estado = 'respaldo-verificado-cambiando-edicion'
    $resultado | ConvertTo-Json | Set-Content -LiteralPath $rutaResultado -Encoding UTF8
    # Clave publica de Enterprise Developer, declarada por FREEEDITIONS del instalador Microsoft.
    $argumentosSetup = @(
        '/Q', '/ACTION=EditionUpgrade', '/INSTANCENAME=MSSQLSERVER',
        '/PID=22222-00000-00000-00000-00000', '/IACCEPTSQLSERVERLICENSETERMS'
    )
    if ($OmitirComprobacionMotorVencido) {
        # Procedimiento oficial para el fallo Engine_SqlEngineHealthCheck:
        # https://learn.microsoft.com/sql/database-engine/install-windows/upgrade-downgrade-sql-server-edition-setup
        $eventoVencimiento = Get-WinEvent -FilterHashtable @{
            LogName = 'Application'; ProviderName = 'MSSQLSERVER'; Id = 17051; StartTime = (Get-Date).AddHours(-1)
        } -MaxEvents 1 -ErrorAction Stop
        if (-not $eventoVencimiento) { throw 'No se confirmo el vencimiento del motor.' }
        $argumentosSetup += '/SkipRules=Engine_SqlEngineHealthCheck'
    }
    $proceso = Start-Process -FilePath $rutaSetup -ArgumentList $argumentosSetup -WindowStyle Hidden -Wait -PassThru
    $resultado.codigoInstalador = $proceso.ExitCode
    if ($proceso.ExitCode -notin 0,3010) { throw "El instalador termino con codigo $($proceso.ExitCode)." }
    Start-Service MSSQLSERVER
    $resultado.estado = 'completado'
}
catch {
    $resultado.estado = 'error'
    $resultado.error = $_.Exception.Message
}
finally {
    $resultado | ConvertTo-Json | Set-Content -LiteralPath $rutaResultado -Encoding UTF8
}
