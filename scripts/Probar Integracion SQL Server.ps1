[CmdletBinding()]
param(
    [Parameter()]
    [string]$InstanciaServidor = 'localhost',

    [Parameter()]
    [int]$PuertoSqlServer = 1433
)

$ErrorActionPreference = 'Stop'

function NuevaCadenaAleatoriaHexadecimal {
    param([int]$CantidadBytes)

    $bytes = New-Object byte[] $CantidadBytes
    $generador = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generador.GetBytes($bytes)
        return [BitConverter]::ToString($bytes).Replace('-', '')
    }
    finally {
        $generador.Dispose()
    }
}

$raizRepositorio = Split-Path -Parent $PSScriptRoot
$sufijo = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$nombreBase = "PruebaFlyway$sufijo"
$nombreUsuario = "pruebaflyway$sufijo"
$contrasena = (NuevaCadenaAleatoriaHexadecimal -CantidadBytes 24) + 'Aa9!'
$correoAdministrador = "administrador.$sufijo@prueba.local"
$contrasenaAdministrador = (NuevaCadenaAleatoriaHexadecimal -CantidadBytes 24) + 'Aa9!'
$puerto = Get-Random -Minimum 20000 -Maximum 30000
$archivoSalida = [System.IO.Path]::GetTempFileName()
$archivoErrores = [System.IO.Path]::GetTempFileName()
$procesoServidor = $null
$objetosTemporalesCreados = $false
$cadenaPrincipal = "Server=$InstanciaServidor;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
$conexionPrincipal = [System.Data.SqlClient.SqlConnection]::new($cadenaPrincipal)
$nombresVariables = @(
    'BDSERVIDOR',
    'BDPUERTO',
    'BDNOMBRE',
    'BDUSUARIO',
    'BDCONTRASENA',
    'BDUSUARIOMIGRACION',
    'BDCONTRASENAMIGRACION',
    'BDCIFRAR',
    'BDCONFIARCERTIFICADOSERVIDOR',
    'PUERTOSERVIDOR',
    'SEGURIDADCLAVEHUELLAS',
    'ADMININICIALHABILITADO',
    'ADMININICIALCORREO',
    'ADMININICIALNOMBRE',
    'ADMININICIALAPELLIDO',
    'ADMININICIALCONTRASENA'
)
$valoresAnteriores = @{}

foreach ($nombreVariable in $nombresVariables) {
    $valoresAnteriores[$nombreVariable] = [Environment]::GetEnvironmentVariable($nombreVariable, 'Process')
}

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
    $objetosTemporalesCreados = $true

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
    $env:SEGURIDADCLAVEHUELLAS = NuevaCadenaAleatoriaHexadecimal -CantidadBytes 32
    $env:ADMININICIALHABILITADO = 'true'
    $env:ADMININICIALCORREO = $correoAdministrador
    $env:ADMININICIALNOMBRE = 'Administrador'
    $env:ADMININICIALAPELLIDO = 'Prueba'
    $env:ADMININICIALCONTRASENA = $contrasenaAdministrador

    $rutaJar = Join-Path $raizRepositorio 'backend\target\servidor-0.0.1-SNAPSHOT.jar'
    if (-not (Test-Path -LiteralPath $rutaJar -PathType Leaf)) {
        throw "No se encontró el servidor compilado en: $rutaJar"
    }
    $rutaJava = if ($env:JAVA_HOME) {
        Join-Path $env:JAVA_HOME 'bin\java.exe'
    }
    else {
        (Get-Command 'java.exe' -ErrorAction Stop).Source
    }
    if (-not (Test-Path -LiteralPath $rutaJava -PathType Leaf)) {
        throw "No se encontró Java en: $rutaJava"
    }

    $procesoServidor = Start-Process `
        -FilePath $rutaJava `
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

    $idCorrelacionEncabezados = [Guid]::NewGuid().ToString()
    $respuestaEncabezados = Invoke-WebRequest `
        -Uri "http://127.0.0.1:$puerto/api/v1/sistema/estado" `
        -Headers @{ 'X-Correlation-ID' = $idCorrelacionEncabezados } `
        -UseBasicParsing `
        -TimeoutSec 5
    if ($respuestaEncabezados.Headers['X-Correlation-ID'] -ne $idCorrelacionEncabezados) {
        throw 'El servidor no conservó el identificador de correlación válido.'
    }
    if ($respuestaEncabezados.Headers['X-Content-Type-Options'] -ne 'nosniff' -or
        $respuestaEncabezados.Headers['Referrer-Policy'] -ne 'strict-origin-when-cross-origin' -or
        $respuestaEncabezados.Headers['Content-Security-Policy'] -notlike "*frame-ancestors 'none'*") {
        throw 'Los encabezados de seguridad esperados no están completos.'
    }

    $contratoOpenApi = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$puerto/api/v1/openapi" `
        -TimeoutSec 5
    if ($null -eq $contratoOpenApi.paths.PSObject.Properties['/api/v1/publico/publicaciones']) {
        throw 'El contrato OpenAPI no documentó el portal público.'
    }

    $codigoMetricasSinSesion = $null
    try {
        [void](Invoke-WebRequest `
            -Uri "http://127.0.0.1:$puerto/actuator/metrics" `
            -UseBasicParsing `
            -TimeoutSec 5)
    }
    catch {
        if ($null -eq $_.Exception.Response) { throw }
        $codigoMetricasSinSesion = [int]$_.Exception.Response.StatusCode
    }
    if ($codigoMetricasSinSesion -ne 401) {
        throw 'Las métricas operativas quedaron expuestas sin autenticación.'
    }

    $urlApiPublica = "http://127.0.0.1:$puerto/api/v1/publico"
    $publicacionesPublicas = Invoke-RestMethod -Uri "$urlApiPublica/publicaciones" -TimeoutSec 5
    $eventosPublicos = Invoke-RestMethod -Uri "$urlApiPublica/eventos" -TimeoutSec 5
    $areasPublicas = Invoke-RestMethod -Uri "$urlApiPublica/areas" -TimeoutSec 5
    $bicicletasPublicas = Invoke-RestMethod -Uri "$urlApiPublica/bicicletas/resumen" -TimeoutSec 5
    $contenidoInstitucionalInicial = Invoke-RestMethod -Uri "$urlApiPublica/institucional" -TimeoutSec 5
    if ($contenidoInstitucionalInicial.mision -ne 'Promover el deporte, la recreación y la convivencia familiar mediante espacios accesibles, seguros e inclusivos para la comunidad.') {
        throw 'El contenido institucional inicial no conservó el texto público existente.'
    }

    $sesionWeb = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $urlAutenticacion = "http://127.0.0.1:$puerto/api/v1/autenticacion"
    $csrf = Invoke-RestMethod -Uri "$urlAutenticacion/csrf" -WebSession $sesionWeb -TimeoutSec 5
    $encabezadosCsrf = @{}
    $encabezadosCsrf[$csrf.nombreEncabezado] = $csrf.token
    $datosInicioSesion = @{
        correo = $correoAdministrador
        contrasena = $contrasenaAdministrador
        mantenerSesionActiva = $false
    } | ConvertTo-Json
    [void](Invoke-RestMethod `
        -Uri "$urlAutenticacion/iniciar-sesion" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosInicioSesion `
        -WebSession $sesionWeb `
        -TimeoutSec 5)

    $csrf = Invoke-RestMethod -Uri "$urlAutenticacion/csrf" -WebSession $sesionWeb -TimeoutSec 5
    $encabezadosCsrf = @{}
    $encabezadosCsrf[$csrf.nombreEncabezado] = $csrf.token
    $urlAdministracion = "http://127.0.0.1:$puerto/api/v1/administracion"
    $contenidoInstitucionalAdministrado = Invoke-RestMethod `
        -Uri "$urlAdministracion/institucional" `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $datosContenidoInstitucional = @{
        resumen = 'Resumen actualizado durante la prueba de integración.'
        mision = 'Misión actualizada durante la prueba de integración.'
        vision = 'Visión actualizada durante la prueba de integración.'
        valores = 'Valores actualizados durante la prueba de integración.'
        version = $contenidoInstitucionalAdministrado.version
    } | ConvertTo-Json
    $contenidoInstitucionalActualizado = Invoke-RestMethod `
        -Uri "$urlAdministracion/institucional" `
        -Method Put `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosContenidoInstitucional `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $contenidoInstitucionalPublico = Invoke-RestMethod -Uri "$urlApiPublica/institucional" -TimeoutSec 5
    if ($contenidoInstitucionalActualizado.version -le $contenidoInstitucionalAdministrado.version -or
        $contenidoInstitucionalPublico.resumen -ne 'Resumen actualizado durante la prueba de integración.') {
        throw 'La actualización institucional no se reflejó de forma consistente en el portal público.'
    }
    $rolesIniciales = Invoke-RestMethod `
        -Uri "$urlAdministracion/roles" `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($rolesIniciales.codigo -notcontains 'USUARIOREGISTRADO') {
        throw 'No está disponible el rol base para las cuentas registradas.'
    }
    $permisosIniciales = Invoke-RestMethod `
        -Uri "$urlAdministracion/permisos" `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($permisosIniciales.codigo -notcontains 'EVENTOLEER') {
        throw 'No está disponible el permiso requerido para probar los roles de empleados.'
    }
    $datosRolEmpleado = @{
        nombre = 'Apoyo de integración'
        descripcion = 'Rol temporal para verificar empleados.'
        codigosPermisos = @('EVENTOLEER')
    } | ConvertTo-Json
    $rolEmpleado = Invoke-RestMethod `
        -Uri "$urlAdministracion/roles" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosRolEmpleado `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($rolEmpleado.codigo -ne 'EMPLEADO_APOYO_DE_INTEGRACION' -or
        $rolEmpleado.permisos -notcontains 'EVENTOLEER') {
        throw 'La creación del rol para empleados no conservó sus permisos.'
    }
    $datosEmpleado = @{
        nombre = 'Empleado'
        apellido = 'Integración'
        correo = "empleado.$sufijo@prueba.local"
        contrasenaInicial = $contrasenaAdministrador
        codigosRoles = @($rolEmpleado.codigo)
    } | ConvertTo-Json
    $empleadoCreado = Invoke-RestMethod `
        -Uri "$urlAdministracion/empleados" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosEmpleado `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($empleadoCreado.roles -notcontains 'USUARIOREGISTRADO' -or
        $empleadoCreado.roles -notcontains $rolEmpleado.codigo) {
        throw 'El empleado creado no recibió los roles esperados.'
    }
    $metricaSolicitudes = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$puerto/actuator/metrics/http.server.requests" `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($metricaSolicitudes.name -ne 'http.server.requests') {
        throw 'La métrica de solicitudes HTTP no está disponible para el rol autorizado.'
    }
    $metricasPrometheus = Invoke-WebRequest `
        -Uri "http://127.0.0.1:$puerto/actuator/prometheus" `
        -WebSession $sesionWeb `
        -UseBasicParsing `
        -TimeoutSec 5
    if ($metricasPrometheus.Content -notlike '*http_server_requests*') {
        throw 'El formato Prometheus no incluyó las solicitudes HTTP.'
    }

    $datosCategoria = @{
        codigo = 'NOTICIAS'
        nombre = 'Noticias'
        descripcion = 'Categoría para la prueba de integración.'
        ordenVisualizacion = 1
        activa = $true
        version = $null
    } | ConvertTo-Json
    $categoriaCreada = Invoke-RestMethod `
        -Uri "$urlAdministracion/categorias-publicaciones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosCategoria `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $datosPublicacion = @{
        idCategoriaPublicacion = $categoriaCreada.idCategoriaPublicacion
        titulo = 'Publicación de integración'
        resumen = 'Resumen de la publicación temporal.'
        contenido = 'Contenido utilizado únicamente durante la prueba de integración.'
        fechaEditorial = $null
        version = $null
    } | ConvertTo-Json
    $claveIdempotencia = [Guid]::NewGuid().ToString()
    $encabezadosCreacion = @{}
    $encabezadosCreacion[$csrf.nombreEncabezado] = $csrf.token
    $encabezadosCreacion['Idempotency-Key'] = $claveIdempotencia
    $publicacionCreada = Invoke-RestMethod `
        -Uri "$urlAdministracion/publicaciones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCreacion `
        -Body $datosPublicacion `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $publicacionRepetida = Invoke-RestMethod `
        -Uri "$urlAdministracion/publicaciones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCreacion `
        -Body $datosPublicacion `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($publicacionCreada.idPublicacion -ne $publicacionRepetida.idPublicacion) {
        throw 'La creación idempotente generó publicaciones diferentes.'
    }
    $publicacionesAntes = Invoke-RestMethod -Uri "$urlApiPublica/publicaciones" -TimeoutSec 5
    if ($publicacionesAntes.totalElementos -ne 0) {
        throw 'Un borrador fue expuesto en el portal público.'
    }
    $cambioEstado = @{ version = $publicacionCreada.version } | ConvertTo-Json
    $publicacionPublicada = Invoke-RestMethod `
        -Uri "$urlAdministracion/publicaciones/$($publicacionCreada.idPublicacion)/publicar" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $cambioEstado `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $publicacionesDurante = Invoke-RestMethod -Uri "$urlApiPublica/publicaciones" -TimeoutSec 5
    if ($publicacionesDurante.totalElementos -ne 1) {
        throw 'La publicación confirmada no apareció en el portal público.'
    }
    $fechaPublicacion = ([DateTime]$publicacionPublicada.publicadoEn).ToString('yyyy-MM-dd')
    $codigoCategoriaFiltro = [Uri]::EscapeDataString($categoriaCreada.codigo)
    $publicacionesFiltradas = Invoke-RestMethod `
        -Uri "$urlApiPublica/publicaciones?categoria=$codigoCategoriaFiltro&fechaDesde=$fechaPublicacion&fechaHasta=$fechaPublicacion" `
        -TimeoutSec 5
    if ($publicacionesFiltradas.totalElementos -ne 1 -or
        $publicacionesFiltradas.contenido[0].identificadorUrl -ne $publicacionCreada.identificadorUrl) {
        $detalleFiltro = $publicacionesFiltradas | ConvertTo-Json -Depth 8 -Compress
        throw "El filtro público por fecha y tipo de actividad no devolvió la publicación esperada. PublicadoEn: $($publicacionPublicada.publicadoEn). Fecha: $fechaPublicacion. Respuesta: $detalleFiltro"
    }
    $cambioEstado = @{ version = $publicacionPublicada.version } | ConvertTo-Json
    [void](Invoke-RestMethod `
        -Uri "$urlAdministracion/publicaciones/$($publicacionCreada.idPublicacion)/archivar" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $cambioEstado `
        -WebSession $sesionWeb `
        -TimeoutSec 5)
    $publicacionesDespues = Invoke-RestMethod -Uri "$urlApiPublica/publicaciones" -TimeoutSec 5
    if ($publicacionesDespues.totalElementos -ne 0) {
        throw 'La publicación archivada continuó visible en el portal público.'
    }

    $ahoraUtc = [DateTime]::UtcNow
    $datosEvento = @{
        titulo = 'Curso de integración'
        descripcion = 'Actividad temporal para verificar cupos e inscripciones.'
        lugar = 'Pista de prueba'
        iniciaEn = $ahoraUtc.AddDays(2).ToString('o')
        finalizaEn = $ahoraUtc.AddDays(2).AddHours(2).ToString('o')
        inscripcionAbreEn = $ahoraUtc.AddMinutes(-5).ToString('o')
        inscripcionCierraEn = $ahoraUtc.AddDays(1).ToString('o')
        capacidadTotal = 2
        esquemaFormularioJson = '{"campos":[]}'
        requisitos = @(
            @{
                descripcion = 'Aceptar los requisitos de la prueba.'
                obligatorio = $true
                ordenVisualizacion = 0
            }
        )
        version = $null
    } | ConvertTo-Json -Depth 5
    $eventoCreado = Invoke-RestMethod `
        -Uri "$urlAdministracion/eventos" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosEvento `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $eventosAntes = Invoke-RestMethod -Uri "$urlApiPublica/eventos" -TimeoutSec 5
    if ($eventosAntes.totalElementos -ne 0) {
        throw 'Un evento en borrador fue expuesto en el portal público.'
    }
    $cambioEstadoEvento = @{ version = $eventoCreado.version } | ConvertTo-Json
    $eventoPublicado = Invoke-RestMethod `
        -Uri "$urlAdministracion/eventos/$($eventoCreado.idEvento)/publicar" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $cambioEstadoEvento `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $eventosDurante = Invoke-RestMethod -Uri "$urlApiPublica/eventos" -TimeoutSec 5
    if ($eventosDurante.totalElementos -ne 1) {
        throw 'El evento publicado no apareció en el portal público.'
    }

    $datosInscripcion = @{ aceptaRequisitos = $true } | ConvertTo-Json
    $claveInscripcion = [Guid]::NewGuid().ToString()
    $encabezadosInscripcion = @{}
    $encabezadosInscripcion[$csrf.nombreEncabezado] = $csrf.token
    $encabezadosInscripcion['Idempotency-Key'] = $claveInscripcion
    $urlEventos = "http://127.0.0.1:$puerto/api/v1/eventos"
    $inscripcionCreada = Invoke-RestMethod `
        -Uri "$urlEventos/$($eventoPublicado.idEvento)/inscripciones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosInscripcion `
        -Body $datosInscripcion `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $inscripcionRepetida = Invoke-RestMethod `
        -Uri "$urlEventos/$($eventoPublicado.idEvento)/inscripciones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosInscripcion `
        -Body $datosInscripcion `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($inscripcionCreada.idInscripcionEvento -ne $inscripcionRepetida.idInscripcionEvento) {
        throw 'La inscripción idempotente generó registros diferentes.'
    }
    if ($inscripcionCreada.cuposDisponibles -ne 1) {
        throw 'La reserva no actualizó los cupos disponibles de forma correcta.'
    }
    $inscripcionesOperador = Invoke-RestMethod `
        -Uri "$urlAdministracion/eventos/$($eventoPublicado.idEvento)/inscripciones" `
        -Headers $encabezadosCsrf `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($inscripcionesOperador.totalElementos -ne 1) {
        throw 'El operador no pudo consultar la inscripción creada.'
    }
    $datosCancelacion = @{ motivo = 'Cancelación de integración.' } | ConvertTo-Json
    $inscripcionCancelada = Invoke-RestMethod `
        -Uri "$urlEventos/$($eventoPublicado.idEvento)/inscripciones/cancelar" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosCancelacion `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($inscripcionCancelada.estado -ne 'CANCELADA' -or $inscripcionCancelada.cuposDisponibles -ne 2) {
        throw 'La cancelación no liberó el cupo de forma correcta.'
    }

    $datosCategoriaArea = @{
        codigo = 'DEPORTIVA'
        nombre = 'Deportiva'
        descripcion = 'Categoría temporal para la prueba de integración.'
        activa = $true
        version = $null
    } | ConvertTo-Json
    $categoriaAreaCreada = Invoke-RestMethod `
        -Uri "$urlAdministracion/categorias-areas" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosCategoriaArea `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $datosArea = @{
        idCategoriaArea = $categoriaAreaCreada.idCategoriaArea
        codigo = 'CANCHAINTEGRACION'
        numeroVisibleMapa = 77
        nombre = 'Cancha de integración'
        descripcion = 'Área temporal para verificar la fase de áreas y mapa.'
        estado = 'DISPONIBLE'
        notaDisponibilidad = 'Disponible durante la prueba.'
        latitud = 14.60000000
        longitud = -90.55000000
        coordenadasConfirmadas = $true
        perimetro = @()
        perimetroConfirmado = $false
        horarioJson = '{"lunes":"08:00-17:00"}'
        observacionesInternas = 'Registro temporal.'
        motivoCambioEstado = 'Registro inicial confirmado.'
        version = $null
    } | ConvertTo-Json
    $areaCreada = Invoke-RestMethod `
        -Uri "$urlAdministracion/areas" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosArea `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $areasDurante = Invoke-RestMethod -Uri "$urlApiPublica/areas" -TimeoutSec 5
    if ($areasDurante.Count -ne 1 -or $areasDurante[0].codigo -ne 'CANCHAINTEGRACION') {
        throw 'El área confirmada no apareció en el portal público.'
    }

    $datosNodoEntrada = @{
        idArea = $null
        tipoNodo = 'ENTRADA'
        nombre = 'Entrada de integración'
        latitud = 14.60000000
        longitud = -90.55000000
        coordenadasConfirmadas = $true
        accesible = $true
        version = $null
    } | ConvertTo-Json
    $nodoEntrada = Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/nodos" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosNodoEntrada `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $datosNodoIntermedio = @{
        idArea = $null
        tipoNodo = 'INTERSECCION'
        nombre = 'Intersección de integración'
        latitud = 14.60050000
        longitud = -90.55050000
        coordenadasConfirmadas = $true
        accesible = $true
        version = $null
    } | ConvertTo-Json
    $nodoIntermedio = Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/nodos" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosNodoIntermedio `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $datosNodoDestino = @{
        idArea = $areaCreada.idArea
        tipoNodo = 'DESTINO'
        nombre = 'Cancha de integración'
        latitud = 14.60100000
        longitud = -90.55100000
        coordenadasConfirmadas = $true
        accesible = $true
        version = $null
    } | ConvertTo-Json
    $nodoDestino = Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/nodos" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosNodoDestino `
        -WebSession $sesionWeb `
        -TimeoutSec 5

    $ahoraReservaArea = [DateTime]::UtcNow
    $datosReservaArea = @{
        titulo = 'Reserva de integración'
        iniciaEn = $ahoraReservaArea.AddMinutes(-5).ToString('o')
        finalizaEn = $ahoraReservaArea.AddHours(1).ToString('o')
        estado = 'PROGRAMADA'
        observaciones = 'Reserva temporal para verificar el reloj del mapa.'
        version = $null
    } | ConvertTo-Json
    $reservaAreaCreada = Invoke-RestMethod `
        -Uri "$urlAdministracion/areas/$($areaCreada.idArea)/reservas" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosReservaArea `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $reservasArea = Invoke-RestMethod `
        -Uri "$urlAdministracion/areas/$($areaCreada.idArea)/reservas" `
        -Headers $encabezadosCsrf `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($reservasArea.Count -ne 1 -or $reservaAreaCreada.estado -ne 'PROGRAMADA') {
        throw 'La agenda de disponibilidad del área no persistió la reserva creada.'
    }

    $datosConexionUno = @{
        idNodoOrigen = $nodoEntrada.idNodoMapa
        idNodoDestino = $nodoIntermedio.idNodoMapa
        distanciaMetros = 40.00
        bidireccional = $true
        accesible = $true
        cerrada = $false
        motivoCierre = $null
        version = $null
    } | ConvertTo-Json
    [void](Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/conexiones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosConexionUno `
        -WebSession $sesionWeb `
        -TimeoutSec 5)
    $datosConexionDos = @{
        idNodoOrigen = $nodoIntermedio.idNodoMapa
        idNodoDestino = $nodoDestino.idNodoMapa
        distanciaMetros = 60.00
        bidireccional = $true
        accesible = $true
        cerrada = $false
        motivoCierre = $null
        version = $null
    } | ConvertTo-Json
    [void](Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/conexiones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosConexionDos `
        -WebSession $sesionWeb `
        -TimeoutSec 5)
    $datosConexionDirecta = @{
        idNodoOrigen = $nodoEntrada.idNodoMapa
        idNodoDestino = $nodoDestino.idNodoMapa
        distanciaMetros = 50.00
        bidireccional = $true
        accesible = $false
        cerrada = $false
        motivoCierre = $null
        version = $null
    } | ConvertTo-Json
    $conexionDirecta = Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/conexiones" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosConexionDirecta `
        -WebSession $sesionWeb `
        -TimeoutSec 5

    $mapaPublico = Invoke-RestMethod -Uri "$urlApiPublica/mapa" -TimeoutSec 5
    if ($mapaPublico.nodos.Count -ne 3 -or $mapaPublico.conexiones.Count -ne 3) {
        throw 'El mapa público no expuso los nodos y conexiones confirmados.'
    }
    $nodoAreaPublico = $mapaPublico.nodos |
        Where-Object { $_.idNodoMapa -eq $nodoDestino.idNodoMapa } |
        Select-Object -First 1
    if ($null -eq $nodoAreaPublico -or
        $nodoAreaPublico.estadoCalculadoArea -ne 'ENUSO' -or
        $nodoAreaPublico.disponibleAhora -ne $false -or
        $null -eq $nodoAreaPublico.cambiaEstadoEn) {
        throw 'El mapa público no reflejó la reserva activa con estado y reloj.'
    }
    $rutaGeneral = Invoke-RestMethod `
        -Uri "$urlApiPublica/mapa/ruta?origen=$($nodoEntrada.idNodoMapa)&destino=$($nodoDestino.idNodoMapa)&accesible=false" `
        -TimeoutSec 5
    $rutaAccesible = Invoke-RestMethod `
        -Uri "$urlApiPublica/mapa/ruta?origen=$($nodoEntrada.idNodoMapa)&destino=$($nodoDestino.idNodoMapa)&accesible=true" `
        -TimeoutSec 5
    if ([decimal]$rutaGeneral.distanciaTotalMetros -ne 50.00 -or
        [decimal]$rutaAccesible.distanciaTotalMetros -ne 100.00) {
        throw 'El cálculo de rutas no respetó el grafo o el perfil accesible.'
    }
    $datosCierreConexion = @{
        idNodoOrigen = $conexionDirecta.idNodoOrigen
        idNodoDestino = $conexionDirecta.idNodoDestino
        distanciaMetros = $conexionDirecta.distanciaMetros
        bidireccional = $conexionDirecta.bidireccional
        accesible = $conexionDirecta.accesible
        cerrada = $true
        motivoCierre = 'Cierre temporal de integración.'
        version = $conexionDirecta.version
    } | ConvertTo-Json
    [void](Invoke-RestMethod `
        -Uri "$urlAdministracion/mapa/conexiones/$($conexionDirecta.idConexionMapa)" `
        -Method Put `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosCierreConexion `
        -WebSession $sesionWeb `
        -TimeoutSec 5)
    $rutaSinConexionCerrada = Invoke-RestMethod `
        -Uri "$urlApiPublica/mapa/ruta?origen=$($nodoEntrada.idNodoMapa)&destino=$($nodoDestino.idNodoMapa)&accesible=false" `
        -TimeoutSec 5
    if ([decimal]$rutaSinConexionCerrada.distanciaTotalMetros -ne 100.00) {
        throw 'Una conexión cerrada fue utilizada por el cálculo de rutas.'
    }

    $datosAreaActualizada = @{
        idCategoriaArea = $areaCreada.idCategoriaArea
        codigo = $areaCreada.codigo
        numeroVisibleMapa = $areaCreada.numeroVisibleMapa
        nombre = $areaCreada.nombre
        descripcion = $areaCreada.descripcion
        estado = 'ENMANTENIMIENTO'
        notaDisponibilidad = 'Cerrada temporalmente.'
        latitud = $areaCreada.latitud
        longitud = $areaCreada.longitud
        coordenadasConfirmadas = $areaCreada.coordenadasConfirmadas
        perimetro = @($areaCreada.perimetro)
        perimetroConfirmado = $areaCreada.perimetroConfirmado
        horarioJson = $areaCreada.horarioJson
        observacionesInternas = 'Mantenimiento de integración.'
        motivoCambioEstado = 'Mantenimiento programado de integración.'
        version = $areaCreada.version
    } | ConvertTo-Json
    [void](Invoke-RestMethod `
        -Uri "$urlAdministracion/areas/$($areaCreada.idArea)" `
        -Method Put `
        -ContentType 'application/json' `
        -Headers $encabezadosCsrf `
        -Body $datosAreaActualizada `
        -WebSession $sesionWeb `
        -TimeoutSec 5)
    $historialArea = Invoke-RestMethod `
        -Uri "$urlAdministracion/areas/$($areaCreada.idArea)/historial" `
        -Headers $encabezadosCsrf `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($historialArea.Count -ne 2 -or $historialArea[0].estadoNuevo -ne 'ENMANTENIMIENTO') {
        throw 'El cambio de estado no conservó el historial inmutable del área.'
    }

    $datosBicicleta = @{
        codigo = 'BICINTEGRACION'
        estadoInicial = 'DISPONIBLE'
        observacionesInventario = 'Bicicleta temporal para la prueba de integración.'
        motivoEstadoInicial = 'Registro inicial de integración.'
    } | ConvertTo-Json
    $encabezadosCreacionBicicleta = $encabezadosCsrf.Clone()
    $encabezadosCreacionBicicleta['Idempotency-Key'] = "crear-bicicleta-$sufijo"
    $idCorrelacionBicicleta = [Guid]::NewGuid().ToString()
    $encabezadosCreacionBicicleta['X-Correlation-ID'] = $idCorrelacionBicicleta
    $bicicletaCreada = Invoke-RestMethod `
        -Uri "$urlAdministracion/bicicletas" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCreacionBicicleta `
        -Body $datosBicicleta `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $bicicletaRepetida = Invoke-RestMethod `
        -Uri "$urlAdministracion/bicicletas" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosCreacionBicicleta `
        -Body $datosBicicleta `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($bicicletaCreada.idBicicleta -ne $bicicletaRepetida.idBicicleta) {
        throw 'La creación idempotente generó más de una bicicleta.'
    }
    $resumenBicicletasDisponibles = Invoke-RestMethod `
        -Uri "$urlApiPublica/bicicletas/resumen" `
        -TimeoutSec 5
    if ($resumenBicicletasDisponibles.total -ne 1 -or
        $resumenBicicletasDisponibles.disponibles -ne 1) {
        throw 'El resumen público no reflejó la bicicleta disponible.'
    }

    $datosCambioEstadoBicicleta = @{
        estado = 'ENMANTENIMIENTO'
        motivo = 'Mantenimiento preventivo de integración.'
        version = $bicicletaCreada.version
    } | ConvertTo-Json
    $encabezadosEstadoBicicleta = $encabezadosCsrf.Clone()
    $encabezadosEstadoBicicleta['Idempotency-Key'] = "estado-bicicleta-$sufijo"
    $bicicletaActualizada = Invoke-RestMethod `
        -Uri "$urlAdministracion/bicicletas/$($bicicletaCreada.idBicicleta)/estado" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosEstadoBicicleta `
        -Body $datosCambioEstadoBicicleta `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    $bicicletaActualizadaRepetida = Invoke-RestMethod `
        -Uri "$urlAdministracion/bicicletas/$($bicicletaCreada.idBicicleta)/estado" `
        -Method Post `
        -ContentType 'application/json' `
        -Headers $encabezadosEstadoBicicleta `
        -Body $datosCambioEstadoBicicleta `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($bicicletaActualizada.estado -ne 'ENMANTENIMIENTO' -or
        $bicicletaActualizadaRepetida.idBicicleta -ne $bicicletaCreada.idBicicleta) {
        throw 'El cambio de estado idempotente de la bicicleta no fue consistente.'
    }
    $historialBicicleta = Invoke-RestMethod `
        -Uri "$urlAdministracion/bicicletas/$($bicicletaCreada.idBicicleta)/historial" `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($historialBicicleta.Count -ne 2 -or
        $historialBicicleta[0].estadoNuevo -ne 'ENMANTENIMIENTO') {
        throw 'El cambio de estado no conservó el historial inmutable de la bicicleta.'
    }
    $resumenBicicletasMantenimiento = Invoke-RestMethod `
        -Uri "$urlApiPublica/bicicletas/resumen" `
        -TimeoutSec 5
    if ($resumenBicicletasMantenimiento.total -ne 1 -or
        $resumenBicicletasMantenimiento.disponibles -ne 0 -or
        $resumenBicicletasMantenimiento.cantidadesPorEstado.ENMANTENIMIENTO -ne 1) {
        throw 'El resumen público no reflejó el estado actualizado de la bicicleta.'
    }

    $auditoriaBicicleta = Invoke-RestMethod `
        -Uri "$urlAdministracion/auditoria?accion=BICICLETACREADA&tamano=10" `
        -WebSession $sesionWeb `
        -TimeoutSec 5
    if ($auditoriaBicicleta.totalElementos -ne 1 -or
        $auditoriaBicicleta.contenido[0].idCorrelacion -ne $idCorrelacionBicicleta -or
        $auditoriaBicicleta.contenido[0].nombreActor -ne 'Administrador Prueba') {
        throw 'La consulta de auditoría no conservó el actor o la correlación de la operación.'
    }

    $lineaBaseRendimiento = & (Join-Path $PSScriptRoot 'Medir Rendimiento Local.ps1') `
        -Url "$urlApiPublica/publicaciones?tamano=5" `
        -CantidadSolicitudes 40 `
        -Concurrencia 4
    if ($lineaBaseRendimiento.Fallidas -ne 0) {
        throw 'La medición local de rendimiento encontró solicitudes fallidas.'
    }

    $conexionConsulta = [System.Data.SqlClient.SqlConnection]::new($cadenaBase)
    try {
        $conexionConsulta.Open()
        $consultaInmutabilidad = $conexionConsulta.CreateCommand()
        $consultaInmutabilidad.CommandText = 'UPDATE TOP (1) dbo.EventosAuditoria SET Resultado = Resultado;'
        $auditoriaProtegida = $false
        try {
            [void]$consultaInmutabilidad.ExecuteNonQuery()
        }
        catch [System.Data.SqlClient.SqlException] {
            if ($_.Exception.Number -ne 51000) { throw }
            $auditoriaProtegida = $true
        }
        if (-not $auditoriaProtegida) {
            throw 'La base de datos permitió modificar eventos de auditoría.'
        }

        $consultaResumen = $conexionConsulta.CreateCommand()
        $consultaResumen.CommandText = @"
SELECT
    (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0 AND name <> 'HistorialMigraciones') AS Tablas,
    (SELECT COUNT(*) FROM dbo.Roles) AS Roles,
    (SELECT COUNT(*) FROM dbo.Permisos) AS Permisos,
    (SELECT COUNT(*) FROM dbo.HistorialMigraciones WHERE success = 1) AS Migraciones,
    (SELECT COUNT(*) FROM dbo.EventosAuditoria) AS Auditorias,
    (SELECT COUNT(*) FROM dbo.InscripcionesEvento) AS Inscripciones,
    (SELECT COUNT(*) FROM dbo.Notificaciones) AS Notificaciones,
    (SELECT COUNT(*) FROM dbo.Areas) AS Areas,
    (SELECT COUNT(*) FROM dbo.HistorialEstadosArea) AS HistorialAreas,
    (SELECT COUNT(*) FROM dbo.ReservasArea) AS ReservasAreas,
    (SELECT COUNT(*) FROM dbo.NodosMapa) AS NodosMapa,
    (SELECT COUNT(*) FROM dbo.ConexionesMapa) AS ConexionesMapa,
    (SELECT COUNT(*) FROM dbo.Bicicletas) AS Bicicletas,
    (SELECT COUNT(*) FROM dbo.HistorialEstadosBicicleta) AS HistorialBicicletas,
    (SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.EventosAuditoria') AND name = 'IXEventosAuditoriaFecha') AS IndicesAuditoria,
    (SELECT COUNT(*) FROM sys.triggers WHERE parent_id = OBJECT_ID('dbo.EventosAuditoria') AND name = 'TR_EventosAuditoriaInmutable') AS ProteccionesAuditoria;
"@
        $lector = $consultaResumen.ExecuteReader()
        [void]$lector.Read()
        Write-Host "API: $($respuesta.estado), servicio $($respuesta.servicio), versión $($respuesta.versionApi)"
        Write-Host "Portal público: $($publicacionesPublicas.totalElementos) publicaciones, $($eventosPublicos.totalElementos) eventos, $($areasPublicas.Count) áreas, $($bicicletasPublicas.total) bicicletas"
        Write-Host "CMS: borrador, idempotencia, publicación, filtro por fecha y tipo de actividad, y archivado verificados; $($lector['Auditorias']) eventos de auditoría"
        Write-Host "Eventos: publicación, cupo, idempotencia y cancelación verificadas; $($lector['Inscripciones']) inscripción y $($lector['Notificaciones']) notificaciones persistidas"
        Write-Host "Áreas y mapa: $($lector['Areas']) área, $($lector['HistorialAreas']) estados históricos, $($lector['ReservasAreas']) reserva, $($lector['NodosMapa']) nodos y $($lector['ConexionesMapa']) conexiones; rutas, reloj y cierre verificados"
        Write-Host "Bicicletas: $($lector['Bicicletas']) registro, $($lector['HistorialBicicletas']) estados históricos; creación, cambio de estado, idempotencia y resumen público verificados"
        Write-Host "Contenido institucional: edición administrativa y publicación de misión, visión y valores verificadas"
        Write-Host "Usuarios y roles: creación de rol operativo, permisos y empleado verificados"
        Write-Host "Seguridad y operación: correlación, encabezados, OpenAPI, acceso a métricas y auditoría inmutable verificados"
        Write-Host "Rendimiento local: 40 solicitudes, concurrencia 4, p95 $($lineaBaseRendimiento.P95Ms) ms, sin umbral institucional inventado"
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
catch {
    Write-Host 'Salida del servidor al fallar la integración:'
    Get-Content -LiteralPath $archivoSalida -Tail 100
    Write-Host 'Errores del servidor al fallar la integración:'
    Get-Content -LiteralPath $archivoErrores -Tail 100
    throw
}
finally {
    if ($null -ne $procesoServidor) {
        $procesoServidorActivo = Get-Process -Id $procesoServidor.Id -ErrorAction SilentlyContinue
        if ($null -ne $procesoServidorActivo) {
            Stop-Process -Id $procesoServidor.Id -Force
            $procesoServidorActivo.WaitForExit()
        }
    }

    if ($objetosTemporalesCreados) {
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
        Write-Host "Objetos temporales eliminados: $nombreBase"
    }

    if ($conexionPrincipal.State -ne [System.Data.ConnectionState]::Closed) {
        $conexionPrincipal.Close()
    }
    $conexionPrincipal.Dispose()

    foreach ($nombreVariable in $nombresVariables) {
        [Environment]::SetEnvironmentVariable(
            $nombreVariable,
            $valoresAnteriores[$nombreVariable],
            'Process')
    }

    foreach ($archivoTemporal in @($archivoSalida, $archivoErrores)) {
        $rutaTemporal = [System.IO.Path]::GetFullPath($archivoTemporal)
        $carpetaTemporal = [System.IO.Path]::GetTempPath()
        if ($rutaTemporal.StartsWith($carpetaTemporal, [System.StringComparison]::OrdinalIgnoreCase) -and
            (Test-Path -LiteralPath $rutaTemporal)) {
            Remove-Item -LiteralPath $rutaTemporal -Force
        }
    }
}
