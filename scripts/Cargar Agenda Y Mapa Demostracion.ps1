[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$CorreoAdministrador,
    [Parameter(Mandatory)] [string]$ContrasenaAdministrador,
    [Parameter(Mandatory)] [string]$CorreoUsuarioPrueba,
    [Parameter(Mandatory)] [string]$ContrasenaUsuarioPrueba,
    [string]$UrlApi = 'http://127.0.0.1:8080/api/v1'
)

$ErrorActionPreference = 'Stop'

function Convertir-CuerpoJson { param([object]$Datos) $Datos | ConvertTo-Json -Depth 12 -Compress }

function Invocar-Api {
    param(
        [Parameter(Mandatory)] [string]$Ruta,
        [Parameter(Mandatory)] [Microsoft.PowerShell.Commands.WebRequestSession]$Sesion,
        [hashtable]$Encabezados = @{},
        [ValidateSet('GET', 'POST', 'PUT')] [string]$Metodo = 'GET',
        [object]$Datos
    )
    $parametros = @{ Uri = "$UrlApi$Ruta"; Method = $Metodo; WebSession = $Sesion; TimeoutSec = 15; ErrorAction = 'Stop' }
    if ($Encabezados.Count -gt 0) { $parametros.Headers = $Encabezados }
    if ($null -ne $Datos) { $parametros.ContentType = 'application/json'; $parametros.Body = Convertir-CuerpoJson $Datos }
    $respuesta = Invoke-RestMethod @parametros
    if ($respuesta -is [System.Array]) { foreach ($elemento in $respuesta) { Write-Output $elemento }; return }
    $respuesta
}

function Nueva-Sesion {
    param([string]$Correo, [string]$Contrasena)
    $sesion = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $csrf = Invoke-RestMethod -Uri "$UrlApi/autenticacion/csrf" -WebSession $sesion -TimeoutSec 10
    $encabezados = @{}
    $encabezados[$csrf.nombreEncabezado] = $csrf.token
    $perfil = Invocar-Api -Ruta '/autenticacion/iniciar-sesion' -Sesion $sesion -Encabezados $encabezados -Metodo POST -Datos @{
        correo = $Correo; contrasena = $Contrasena; mantenerSesionActiva = $false
    }
    [PSCustomObject]@{ Sesion = $sesion; Encabezados = $encabezados; Perfil = $perfil }
}

function Buscar-Primero {
    param([object[]]$Coleccion, [string]$Propiedad, [string]$Valor)
    @($Coleccion | Where-Object {
        $miembro = $_.PSObject.Properties[$Propiedad]
        $null -ne $miembro -and "$($miembro.Value)" -eq $Valor
    }) | Select-Object -First 1
}

$resultado = [ordered]@{ eventos = 0; inscripciones = 0; areasActualizadas = 0; nodosMapa = 0 }
$administrador = Nueva-Sesion -Correo $CorreoAdministrador -Contrasena $ContrasenaAdministrador
$sesionAdmin = $administrador.Sesion
$encabezadosAdmin = $administrador.Encabezados

$paginaEventos = Invocar-Api -Ruta '/administracion/eventos?pagina=0&tamano=50&orden=ACTUALIZACION' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$eventos = @($paginaEventos.contenido)
$agenda = @(
    [PSCustomObject]@{
        titulo = 'Demostración | Curso deportivo gratuito'
        descripcion = 'Agenda de demostración para probar inscripciones. Se inspira en la nota pública sobre cursos deportivos gratuitos en el Parque Erick Barrondo; la fecha indicada aquí no constituye una convocatoria oficial. Fuente: https://guatemala.gob.gt/parque-erick-barrondo-inicia-cursos-deportivos-gratuitos/'
        lugar = 'Polideportivo'
        inicia = '2026-10-03T14:00:00Z'
        finaliza = '2026-10-03T17:00:00Z'
        cierre = '2026-10-01T23:59:00Z'
        capacidad = 60
    },
    [PSCustomObject]@{
        titulo = 'Demostración | Superclase de yoga'
        descripcion = 'Agenda de demostración para probar inscripciones. La temática se basa en la actividad de yoga anunciada para la pista de atletismo y el polideportivo; esta fecha es únicamente de prueba. Fuente: https://guatemala.gob.gt/parque-erick-barrondo-recibira-superclase-de-yoga-por-el-dia-internacional-del-yoga/'
        lugar = 'Pista de atletismo'
        inicia = '2026-10-24T14:00:00Z'
        finaliza = '2026-10-24T16:00:00Z'
        cierre = '2026-10-22T23:59:00Z'
        capacidad = 80
    },
    [PSCustomObject]@{
        titulo = 'Demostración | Jornada de ciclovía familiar'
        descripcion = 'Agenda de demostración para probar inscripciones. La actividad toma como referencia la ciclovía del Parque Erick Barrondo descrita por el Gobierno de Guatemala; esta fecha es de prueba. Fuente: https://guatemala.gob.gt/la-ciclovia-del-parque-erick-barrondo-un-espacio-ideal-para-ejercitarse-en-la-ciudad/'
        lugar = 'Ciclovía del parque'
        inicia = '2026-11-14T13:00:00Z'
        finaliza = '2026-11-14T17:00:00Z'
        cierre = '2026-11-12T23:59:00Z'
        capacidad = 100
    }
)

foreach ($dato in $agenda) {
    $evento = Buscar-Primero -Coleccion $eventos -Propiedad 'titulo' -Valor $dato.titulo
    if ($null -eq $evento) {
        $evento = Invocar-Api -Ruta '/administracion/eventos' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
            titulo = $dato.titulo
            descripcion = $dato.descripcion
            lugar = $dato.lugar
            iniciaEn = $dato.inicia
            finalizaEn = $dato.finaliza
            inscripcionAbreEn = '2026-09-01T12:00:00Z'
            inscripcionCierraEn = $dato.cierre
            capacidadTotal = $dato.capacidad
            esquemaFormularioJson = '{"campos":[]}'
            configuracionGruposJson = $null
            requisitos = @(@{ descripcion = 'Aceptar los requisitos de esta actividad de demostración.'; obligatorio = $true; ordenVisualizacion = 0 })
            version = $null
        }
        $resultado.eventos++
    }
    if ($evento.estado -eq 'BORRADOR') {
        $evento = Invocar-Api -Ruta "/administracion/eventos/$($evento.idEvento)/publicar" -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{ version = $evento.version }
    }
    $eventos += $evento
}

$paginaAreas = Invocar-Api -Ruta '/administracion/areas?pagina=0&tamano=50' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$areas = @($paginaAreas.contenido)
$datosMapa = @(
    [PSCustomObject]@{ nombre = 'Demostración | Pista de atletismo'; estado = 'ENMANTENIMIENTO'; motivo = 'Mantenimiento preventivo de demostración para el mapa.'; nodo = 'Demostración | Pista de atletismo · mantenimiento'; latitud = 14.63938; longitud = -90.54055 },
    [PSCustomObject]@{ nombre = 'Demostración | Diamante de béisbol'; estado = 'ENUSO'; motivo = 'Actividad en curso de demostración para el mapa.'; nodo = 'Demostración | Diamante de béisbol · en uso'; latitud = 14.63890; longitud = -90.53970 },
    [PSCustomObject]@{ nombre = 'Demostración | Pista de patinaje'; estado = 'ENMANTENIMIENTO'; motivo = 'Revisión técnica de demostración para el mapa.'; nodo = 'Demostración | Pista de patinaje · mantenimiento'; latitud = 14.63820; longitud = -90.54020 }
)

foreach ($dato in $datosMapa) {
    $area = Buscar-Primero -Coleccion $areas -Propiedad 'nombre' -Valor $dato.nombre
    if ($null -eq $area) { throw "No se encontró el área de demostración «$($dato.nombre)»." }
    $requierePerimetro = -not $area.perimetroConfirmado -or @($area.perimetro).Count -lt 3
    $perimetro = if ($requierePerimetro) {
        @(
            @{ latitud = [decimal]($dato.latitud + 0.00012); longitud = [decimal]($dato.longitud - 0.00012) },
            @{ latitud = [decimal]($dato.latitud + 0.00012); longitud = [decimal]($dato.longitud + 0.00012) },
            @{ latitud = [decimal]($dato.latitud - 0.00012); longitud = [decimal]$dato.longitud }
        )
    } else {
        @($area.perimetro)
    }
    if ($area.estado -ne $dato.estado -or $requierePerimetro) {
        $area = Invocar-Api -Ruta "/administracion/areas/$($area.idArea)" -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo PUT -Datos @{
            idCategoriaArea = $area.idCategoriaArea
            numeroVisibleMapa = $area.numeroVisibleMapa
            nombre = $area.nombre
            descripcion = $area.descripcion
            estado = $dato.estado
            perimetro = $perimetro
            horarioJson = $area.horarioJson
            observacionesInternas = "$($area.observacionesInternas) Estado actualizado para demostrar el mapa."
            motivoCambioEstado = $dato.motivo
            version = $area.version
        }
        $resultado.areasActualizadas++
    }
    $areas = @($areas | Where-Object { $_.idArea -ne $area.idArea }) + @($area)
}

$nodos = @(Invocar-Api -Ruta '/administracion/mapa/nodos' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
foreach ($dato in $datosMapa) {
    $area = Buscar-Primero -Coleccion $areas -Propiedad 'nombre' -Valor $dato.nombre
    if ($null -ne (Buscar-Primero -Coleccion $nodos -Propiedad 'idArea' -Valor "$($area.idArea)")) { continue }
    $nodo = Invocar-Api -Ruta '/administracion/mapa/nodos' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
        idArea = $area.idArea
        tipoNodo = 'DESTINO'
        nombre = $dato.nodo
        latitud = $dato.latitud
        longitud = $dato.longitud
        coordenadasConfirmadas = $true
        accesible = $true
        version = $null
    }
    $nodos += $nodo
    $resultado.nodosMapa++
}

$usuario = Nueva-Sesion -Correo $CorreoUsuarioPrueba -Contrasena $ContrasenaUsuarioPrueba
$sesionUsuario = $usuario.Sesion
$encabezadosUsuario = $usuario.Encabezados
$misInscripciones = Invocar-Api -Ruta '/eventos/inscripciones/mias?pagina=0&tamano=50' -Sesion $sesionUsuario -Encabezados $encabezadosUsuario
foreach ($dato in $agenda) {
    $evento = Buscar-Primero -Coleccion $eventos -Propiedad 'titulo' -Valor $dato.titulo
    if ($null -ne (Buscar-Primero -Coleccion @($misInscripciones.contenido) -Propiedad 'idEvento' -Valor "$($evento.idEvento)")) { continue }
    [void](Invocar-Api -Ruta "/eventos/$($evento.idEvento)/inscripciones" -Sesion $sesionUsuario -Encabezados (@{} + $encabezadosUsuario + @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }) -Metodo POST -Datos @{
        aceptaRequisitos = $true
        codigoGrupo = $null
        respuestas = @{}
    })
    $resultado.inscripciones++
}

$misInscripciones = Invocar-Api -Ruta '/eventos/inscripciones/mias?pagina=0&tamano=50' -Sesion $sesionUsuario -Encabezados $encabezadosUsuario
$inscripcionesDemostracion = @($misInscripciones.contenido | Where-Object { $_.tituloEvento -like 'Demostración*' })
if ($inscripcionesDemostracion.Count -lt 3) { throw 'No se confirmaron las tres inscripciones de demostración para el usuario común.' }
$misSolicitudes = Invocar-Api -Ruta '/solicitudes/mias?grupo=TODOS&pagina=0&tamano=50' -Sesion $sesionUsuario -Encabezados $encabezadosUsuario
if ([int64]$misSolicitudes.totalElementos -lt 3) { throw 'El usuario común no tiene las tres solicitudes esperadas.' }
$mapaPublico = Invocar-Api -Ruta '/publico/mapa' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$nodosDemo = @($mapaPublico.nodos | Where-Object { $_.nombre -like 'Demostración*' })
if ($nodosDemo.Count -lt 3) { throw 'El mapa público no expuso los tres destinos de demostración.' }
$areasDemo = @($mapaPublico.areas | Where-Object { $_.nombreArea -like 'Demostración*' -and $_.estadoCalculadoArea -in @('ENUSO', 'ENMANTENIMIENTO') })
if ($areasDemo.Count -lt 3) { throw 'El mapa público no expuso las tres alertas de áreas de demostración.' }

[PSCustomObject]@{
    resultado = $resultado
    inscripcionesDemostracion = $inscripcionesDemostracion.Count
    solicitudesUsuarioComun = $misSolicitudes.totalElementos
    nodosMapaDemostracion = $nodosDemo.Count
    alertasAreasMapaDemostracion = $areasDemo.Count
    estadosMapa = @($nodosDemo | ForEach-Object { [PSCustomObject]@{ nombre = $_.nombre; estado = $_.estadoCalculadoArea } })
} | ConvertTo-Json -Depth 8
