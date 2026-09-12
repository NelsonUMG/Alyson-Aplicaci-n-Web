[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CorreoAdministrador,

    [Parameter(Mandatory)]
    [string]$ContrasenaAdministrador,

    [Parameter(Mandatory)]
    [string]$CorreoUsuarioPrueba,

    [Parameter(Mandatory)]
    [string]$ContrasenaUsuarioPrueba,

    [string]$UrlApi = 'http://127.0.0.1:8080/api/v1'
)

$ErrorActionPreference = 'Stop'

function Convertir-CuerpoJson {
    param([object]$Datos)
    $Datos | ConvertTo-Json -Depth 12 -Compress
}

function Invocar-ApiLocal {
    param(
        [Parameter(Mandatory)] [string]$Ruta,
        [Parameter(Mandatory)] [Microsoft.PowerShell.Commands.WebRequestSession]$Sesion,
        [hashtable]$Encabezados = @{},
        [ValidateSet('GET', 'POST', 'PUT')] [string]$Metodo = 'GET',
        [object]$Datos
    )

    $parametros = @{
        Uri = "$UrlApi$Ruta"
        Method = $Metodo
        WebSession = $Sesion
        TimeoutSec = 15
        ErrorAction = 'Stop'
    }
    if ($Encabezados.Count -gt 0) {
        $parametros.Headers = $Encabezados
    }
    if ($null -ne $Datos) {
        $parametros.ContentType = 'application/json'
        $parametros.Body = Convertir-CuerpoJson $Datos
    }
    $respuesta = Invoke-RestMethod @parametros
    if ($respuesta -is [System.Array]) {
        foreach ($elemento in $respuesta) {
            Write-Output $elemento
        }
        return
    }
    $respuesta
}

function Nueva-SesionAutenticada {
    param(
        [Parameter(Mandatory)] [string]$Correo,
        [Parameter(Mandatory)] [string]$Contrasena
    )

    $sesion = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $csrf = Invoke-RestMethod -Uri "$UrlApi/autenticacion/csrf" -WebSession $sesion -TimeoutSec 10
    $encabezados = @{}
    $encabezados[$csrf.nombreEncabezado] = $csrf.token
    $perfil = Invocar-ApiLocal -Ruta '/autenticacion/iniciar-sesion' -Sesion $sesion -Encabezados $encabezados -Metodo POST -Datos @{
        correo = $Correo
        contrasena = $Contrasena
        mantenerSesionActiva = $false
    }
    [PSCustomObject]@{ Sesion = $sesion; Encabezados = $encabezados; Perfil = $perfil }
}

function Subir-ArchivoLocal {
    param(
        [Parameter(Mandatory)] [string]$Ruta,
        [Parameter(Mandatory)] [string]$Archivo,
        [Parameter(Mandatory)] [Microsoft.PowerShell.Commands.WebRequestSession]$Sesion,
        [hashtable]$Encabezados = @{}
    )

    Invoke-RestMethod -Uri "$UrlApi$Ruta" -Method Post -WebSession $Sesion -Headers $Encabezados `
        -Form @{ archivo = Get-Item -LiteralPath $Archivo } -TimeoutSec 20 -ErrorAction Stop
}

function Obtener-Primero {
    param([object[]]$Coleccion, [string]$Propiedad, [string]$Valor)
    @($Coleccion | Where-Object {
        $propiedadEncontrada = $_.PSObject.Properties[$Propiedad]
        $null -ne $propiedadEncontrada -and "$($propiedadEncontrada.Value)" -eq $Valor
    }) | Select-Object -First 1
}

function Incrementar-Resultado {
    param([string]$Nombre)
    $script:resultado[$Nombre] = [int]$script:resultado[$Nombre] + 1
}

$resultado = [ordered]@{
    categoriasPublicaciones = 0
    publicaciones = 0
    eventos = 0
    categoriasAreas = 0
    areas = 0
    bicicletas = 0
    categoriasTramites = 0
    tramites = 0
    roles = 0
    empleados = 0
    solicitudesUsuario = 0
}

$administrador = Nueva-SesionAutenticada -Correo $CorreoAdministrador -Contrasena $ContrasenaAdministrador
$sesionAdmin = $administrador.Sesion
$encabezadosAdmin = $administrador.Encabezados

$categoriasPublicaciones = @(Invocar-ApiLocal -Ruta '/administracion/categorias-publicaciones' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
$datosPublicaciones = @(
    [PSCustomObject]@{
        codigoCategoria = 'DEMO_ATLETISMO'
        categoria = 'Demostración | Atletismo'
        descripcionCategoria = 'Registros de prueba basados en información pública sobre atletismo en el parque.'
        titulo = 'Demostración | Torneo Nacional de Verano 2026 en el parque'
        resumen = 'Registro de prueba basado en la nota de CDAG sobre el torneo realizado el 20 y 21 de marzo de 2026.'
        contenido = 'El Parque Deportivo Erick Barrondo recibió a atletas de categorías U18, Open y Mayor en pruebas de pista y campo. Esta publicación es una carga de demostración para validar el módulo. Fuente: https://cdag.com.gt/el-parque-erick-barrondo-vibra-con-el-torneo-nacional-de-verano-2026/'
    },
    [PSCustomObject]@{
        codigoCategoria = 'DEMO_RESULTADOS'
        categoria = 'Demostración | Resultados deportivos'
        descripcionCategoria = 'Registros de prueba con resultados y antecedentes deportivos públicos.'
        titulo = 'Demostración | Campeonato de Guatemala de Atletismo 2026'
        resumen = 'Registro de prueba con referencia al campeonato realizado el 17 y 18 de julio de 2026.'
        contenido = 'La ficha pública de World Athletics identifica al Parque Deportivo Erick Barrondo como sede del Campeonato de Guatemala 2026. Este contenido se conserva como demostración de la carga editorial. Fuente: https://worldathletics.org/competition/calendar-results/results/7239880'
    },
    [PSCustomObject]@{
        codigoCategoria = 'DEMO_CICLISMO'
        categoria = 'Demostración | Ciclismo'
        descripcionCategoria = 'Registros de prueba sobre movilidad activa y ciclismo.'
        titulo = 'Demostración | Recorrido en bicicleta 2026 con punto de encuentro en el parque'
        resumen = 'Registro de prueba basado en el Reto Asunción, con reunión en el Parque Erick Barrondo.'
        contenido = 'La referencia publicada por Guatemala.com indicó una reunión a las 06:00 y salida a las 07:00 para el recorrido del 22 de febrero de 2026. Este registro no anuncia un evento nuevo. Fuente: https://eventos.guatemala.com/deportes/recorrido-en-bicicleta-2026-fun-tours.html'
    },
    [PSCustomObject]@{
        codigoCategoria = 'DEMO_ESPACIOS'
        categoria = 'Demostración | Espacios del parque'
        descripcionCategoria = 'Registros de prueba para presentar espacios deportivos y recreativos.'
        titulo = 'Demostración | Espacios deportivos y recreativos del parque'
        resumen = 'Registro de prueba que reúne áreas deportivas mencionadas en una guía pública del recinto.'
        contenido = 'La guía de referencia describe canchas, pista de atletismo, pista de patinaje, diamante de béisbol, espacios de ciclismo y áreas inclusivas. Verifica horarios y disponibilidad antes de visitar. Fuente: https://www.guatemala.com/aprende/cultura-guatemalteca/parque-erick-barrondo-en-la-ciudad-de-guatemala'
    },
    [PSCustomObject]@{
        codigoCategoria = 'DEMO_FORMACION'
        categoria = 'Demostración | Formación deportiva'
        descripcionCategoria = 'Registros de prueba para academias y actividades de formación.'
        titulo = 'Demostración | Referencia de academia infantil de béisbol'
        resumen = 'Registro de prueba basado en información pública histórica sobre clases infantiles en el diamante del parque.'
        contenido = 'La fuente consultada menciona clases gratuitas de béisbol para niñas y niños, con requisitos y horarios de referencia. Confirma la programación vigente directamente con la administración. Fuente: https://www.guatemala.com/deportes/beisbol/academias-de-beisbol-ninos-ciudad-guatemala.html'
    }
)

foreach ($dato in $datosPublicaciones) {
    $categoria = Obtener-Primero -Coleccion $categoriasPublicaciones -Propiedad 'nombre' -Valor $dato.categoria
    if ($null -eq $categoria) {
        $categoria = Invocar-ApiLocal -Ruta '/administracion/categorias-publicaciones' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
            codigo = $dato.codigoCategoria
            nombre = $dato.categoria
            descripcion = $dato.descripcionCategoria
            ordenVisualizacion = 1000 + @($datosPublicaciones).IndexOf($dato)
            activa = $true
            version = $null
        }
        $categoriasPublicaciones += $categoria
        Incrementar-Resultado 'categoriasPublicaciones'
    }
}

$paginaPublicaciones = Invocar-ApiLocal -Ruta '/administracion/publicaciones?pagina=0&tamano=50&orden=ACTUALIZACION' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$publicacionesActuales = @($paginaPublicaciones.contenido)
$imagenDemostracion = Join-Path $PSScriptRoot '..\frontend\public\imagenes\escudo-guatemala.png'
if (-not (Test-Path -LiteralPath $imagenDemostracion -PathType Leaf)) {
    throw 'No se encontró la imagen local para las publicaciones de demostración.'
}
foreach ($dato in $datosPublicaciones) {
    $publicacion = Obtener-Primero -Coleccion $publicacionesActuales -Propiedad 'titulo' -Valor $dato.titulo
    if ($null -eq $publicacion) {
        $categoria = Obtener-Primero -Coleccion $categoriasPublicaciones -Propiedad 'nombre' -Valor $dato.categoria
        $publicacion = Invocar-ApiLocal -Ruta '/administracion/publicaciones' -Sesion $sesionAdmin -Encabezados (@{} + $encabezadosAdmin + @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }) -Metodo POST -Datos @{
            idCategoriaPublicacion = $categoria.idCategoriaPublicacion
            titulo = $dato.titulo
            resumen = $dato.resumen
            contenido = $dato.contenido
            fechaEditorial = $null
            version = $null
        }
        Incrementar-Resultado 'publicaciones'
    }
    if ($publicacion.estado -eq 'BORRADOR') {
        $imagenes = @(Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/imagenes" -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
        if ($imagenes.Count -eq 0) {
            [void](Subir-ArchivoLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/imagenes" -Archivo $imagenDemostracion -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
        }
        $publicacion = Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/publicar" -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{ version = $publicacion.version }
    }
    $publicacionesActuales += $publicacion
}

$paginaEventos = Invocar-ApiLocal -Ruta '/administracion/eventos?pagina=0&tamano=50&orden=ACTUALIZACION' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$eventosActuales = @($paginaEventos.contenido)
$datosEventos = @(
    [PSCustomObject]@{ titulo = 'Demostración histórica | Torneo Nacional de Verano 2026'; descripcion = 'Registro de prueba basado en la nota de CDAG: competencias de pista y campo desarrolladas en el Parque Erick Barrondo el 20 y 21 de marzo de 2026. Fuente: https://cdag.com.gt/el-parque-erick-barrondo-vibra-con-el-torneo-nacional-de-verano-2026/'; lugar = 'Pista de atletismo'; inicia = '2026-03-20T07:00:00Z'; finaliza = '2026-03-21T15:00:00Z'; cierre = '2026-03-19T23:59:00Z'; capacidad = 434 },
    [PSCustomObject]@{ titulo = 'Demostración histórica | Campeonato de Guatemala de Atletismo 2026'; descripcion = 'Registro de prueba basado en la ficha pública de World Athletics para el campeonato realizado en el Parque Deportivo Erick Barrondo el 17 y 18 de julio de 2026. Fuente: https://worldathletics.org/competition/calendar-results/results/7239880'; lugar = 'Pista de atletismo'; inicia = '2026-07-17T08:00:00Z'; finaliza = '2026-07-18T17:00:00Z'; cierre = '2026-07-16T23:59:00Z'; capacidad = 300 },
    [PSCustomObject]@{ titulo = 'Demostración histórica | Recorrido en bicicleta 2026'; descripcion = 'Registro de prueba basado en el Reto Asunción, cuyo punto de reunión fue el Parque Erick Barrondo el 22 de febrero de 2026. Fuente: https://eventos.guatemala.com/deportes/recorrido-en-bicicleta-2026-fun-tours.html'; lugar = 'Ingreso principal del parque'; inicia = '2026-02-22T12:00:00Z'; finaliza = '2026-02-22T18:30:00Z'; cierre = '2026-02-21T23:59:00Z'; capacidad = 120 },
    [PSCustomObject]@{ titulo = 'Demostración histórica | Jornada de patinaje y convivencia'; descripcion = 'Registro de demostración inspirado en las disciplinas y horarios de referencia del patinódromo del Parque Erick Barrondo. No corresponde a una convocatoria vigente.'; lugar = 'Pista de patinaje'; inicia = '2024-10-12T14:30:00Z'; finaliza = '2024-10-12T17:00:00Z'; cierre = '2024-10-11T23:59:00Z'; capacidad = 80 },
    [PSCustomObject]@{ titulo = 'Demostración histórica | Clínica infantil de béisbol'; descripcion = 'Registro de demostración basado en información pública histórica sobre actividades infantiles en el diamante de béisbol del parque. Confirma cualquier agenda actual con la administración.'; lugar = 'Diamante de béisbol'; inicia = '2024-09-14T15:00:00Z'; finaliza = '2024-09-14T17:00:00Z'; cierre = '2024-09-13T23:59:00Z'; capacidad = 60 }
)
foreach ($dato in $datosEventos) {
    $evento = Obtener-Primero -Coleccion $eventosActuales -Propiedad 'titulo' -Valor $dato.titulo
    if ($null -eq $evento) {
        $evento = Invocar-ApiLocal -Ruta '/administracion/eventos' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
            titulo = $dato.titulo
            descripcion = $dato.descripcion
            lugar = $dato.lugar
            iniciaEn = $dato.inicia
            finalizaEn = $dato.finaliza
            inscripcionAbreEn = ([datetime]$dato.inicia).AddDays(-14).ToUniversalTime().ToString('o')
            inscripcionCierraEn = $dato.cierre
            capacidadTotal = $dato.capacidad
            esquemaFormularioJson = '{"campos":[]}'
            configuracionGruposJson = $null
            requisitos = @(@{ descripcion = 'Registro creado únicamente para la demostración de datos.'; obligatorio = $true; ordenVisualizacion = 0 })
            version = $null
        }
        Incrementar-Resultado 'eventos'
    }
    if ($evento.estado -eq 'BORRADOR') {
        $evento = Invocar-ApiLocal -Ruta "/administracion/eventos/$($evento.idEvento)/publicar" -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{ version = $evento.version }
    }
    if ($evento.estado -eq 'PUBLICADO' -and ([datetime]$dato.finaliza).ToUniversalTime() -lt [datetime]::UtcNow) {
        $evento = Invocar-ApiLocal -Ruta "/administracion/eventos/$($evento.idEvento)/finalizar" -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{ version = $evento.version }
    }
    $eventosActuales += $evento
}

$categoriasAreas = @(Invocar-ApiLocal -Ruta '/administracion/categorias-areas' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
$datosAreas = @(
    [PSCustomObject]@{ categoria = 'Demostración | Atletismo'; descripcionCategoria = 'Áreas de atletismo usadas para carga de demostración.'; nombre = 'Demostración | Pista de atletismo'; descripcion = 'Registro de prueba basado en la pista de atletismo mencionada entre los espacios del parque.' },
    [PSCustomObject]@{ categoria = 'Demostración | Béisbol'; descripcionCategoria = 'Áreas de béisbol usadas para carga de demostración.'; nombre = 'Demostración | Diamante de béisbol'; descripcion = 'Registro de prueba basado en el diamante de béisbol indicado en la guía pública del parque.' },
    [PSCustomObject]@{ categoria = 'Demostración | Patinaje'; descripcionCategoria = 'Áreas de patinaje usadas para carga de demostración.'; nombre = 'Demostración | Pista de patinaje'; descripcion = 'Registro de prueba basado en la pista de patinaje del parque.' },
    [PSCustomObject]@{ categoria = 'Demostración | Ciclismo'; descripcionCategoria = 'Áreas de ciclismo usadas para carga de demostración.'; nombre = 'Demostración | Pista de BMX'; descripcion = 'Registro de prueba basado en la pista de BMX mencionada entre los espacios deportivos.' },
    [PSCustomObject]@{ categoria = 'Demostración | Canchas'; descripcionCategoria = 'Canchas de conjunto usadas para carga de demostración.'; nombre = 'Demostración | Cancha de voleibol'; descripcion = 'Registro de prueba basado en las canchas de voleibol descritas para el recinto.' }
)
foreach ($dato in $datosAreas) {
    $categoria = Obtener-Primero -Coleccion $categoriasAreas -Propiedad 'nombre' -Valor $dato.categoria
    if ($null -eq $categoria) {
        $categoria = Invocar-ApiLocal -Ruta '/administracion/categorias-areas' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
            nombre = $dato.categoria
            descripcion = $dato.descripcionCategoria
            activa = $true
            version = $null
        }
        $categoriasAreas += $categoria
        Incrementar-Resultado 'categoriasAreas'
    }
}

$paginaAreas = Invocar-ApiLocal -Ruta '/administracion/areas?pagina=0&tamano=50' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$areasActuales = @($paginaAreas.contenido)
$numeroMapa = 701
foreach ($dato in $datosAreas) {
    if ($null -eq (Obtener-Primero -Coleccion $areasActuales -Propiedad 'nombre' -Valor $dato.nombre)) {
        $categoria = Obtener-Primero -Coleccion $categoriasAreas -Propiedad 'nombre' -Valor $dato.categoria
        $area = Invocar-ApiLocal -Ruta '/administracion/areas' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
            idCategoriaArea = $categoria.idCategoriaArea
            numeroVisibleMapa = $numeroMapa
            nombre = $dato.nombre
            descripcion = $dato.descripcion
            estado = 'DISPONIBLE'
            perimetro = @()
            horarioJson = '{"referencia":"Verificar horarios vigentes con la administración."}'
            observacionesInternas = 'Registro de demostración basado en espacios deportivos públicos.'
            motivoCambioEstado = 'Alta de datos de demostración.'
            version = $null
        }
        $areasActuales += $area
        Incrementar-Resultado 'areas'
    }
    $numeroMapa++
}

$paginaBicicletas = Invocar-ApiLocal -Ruta '/administracion/bicicletas?pagina=0&tamano=50' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$bicicletasActuales = @($paginaBicicletas.contenido)
1..5 | ForEach-Object {
    $codigo = 'BIC-DEMO-{0:D2}' -f $_
    if ($null -ne (Obtener-Primero -Coleccion $bicicletasActuales -Propiedad 'codigo' -Valor $codigo)) { return }
    $bicicleta = Invocar-ApiLocal -Ruta '/administracion/bicicletas' -Sesion $sesionAdmin -Encabezados (@{} + $encabezadosAdmin + @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }) -Metodo POST -Datos @{
        codigo = $codigo
        estadoInicial = 'DISPONIBLE'
        observacionesInventario = "Bicicleta de demostración $_ para validar inventario y trazabilidad."
        motivoEstadoInicial = 'Carga inicial de datos de demostración.'
    }
    $bicicletasActuales += $bicicleta
    Incrementar-Resultado 'bicicletas'
}

$categoriasTramites = @(Invocar-ApiLocal -Ruta '/administracion/solicitudes/catalogo/categorias' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
$datosTramites = @(
    [PSCustomObject]@{ categoria = 'Demostración | Reservas'; nombre = 'Demostración | Reserva de actividad grupal'; resumen = 'Solicitud de prueba para reservar un espacio para una actividad grupal.'; reserva = $true },
    [PSCustomObject]@{ categoria = 'Demostración | Atención ciudadana'; nombre = 'Demostración | Consulta de atención ciudadana'; resumen = 'Solicitud de prueba para orientación y seguimiento ciudadano.'; reserva = $false },
    [PSCustomObject]@{ categoria = 'Demostración | Inclusión'; nombre = 'Demostración | Solicitud de apoyo inclusivo'; resumen = 'Solicitud de prueba para atención accesible en actividades del parque.'; reserva = $false },
    [PSCustomObject]@{ categoria = 'Demostración | Seguridad'; nombre = 'Demostración | Reporte preventivo de seguridad'; resumen = 'Solicitud de prueba para comunicar una observación preventiva.'; reserva = $false },
    [PSCustomObject]@{ categoria = 'Demostración | Formación'; nombre = 'Demostración | Inscripción de interés deportivo'; resumen = 'Solicitud de prueba para expresar interés en una actividad formativa.'; reserva = $false }
)
foreach ($dato in $datosTramites) {
    $categoria = Obtener-Primero -Coleccion $categoriasTramites -Propiedad 'nombre' -Valor $dato.categoria
    if ($null -eq $categoria) {
        $categoria = Invocar-ApiLocal -Ruta '/administracion/solicitudes/catalogo/categorias' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{ nombre = $dato.categoria }
        $categoriasTramites += $categoria
        Incrementar-Resultado 'categoriasTramites'
    }
}
$tramitesActuales = @(Invocar-ApiLocal -Ruta '/administracion/solicitudes/catalogo' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
foreach ($dato in $datosTramites) {
    if ($null -ne (Obtener-Primero -Coleccion $tramitesActuales -Propiedad 'nombre' -Valor $dato.nombre)) { continue }
    $categoria = Obtener-Primero -Coleccion $categoriasTramites -Propiedad 'nombre' -Valor $dato.categoria
    $tramite = Invocar-ApiLocal -Ruta '/administracion/solicitudes/catalogo' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
        idCategoria = $categoria.idCategoria
        nombre = $dato.nombre
        resumen = $dato.resumen
        acerca = 'Registro de demostración para validar el catálogo de solicitudes. La información se debe sustituir por el procedimiento oficial antes de publicar el portal.'
        requisitos = @('Completar los datos de contacto.', 'Aceptar los términos de atención del parque.')
        documentosRequeridos = @('Documento de identificación cuando el trámite oficial lo requiera.')
        costo = 'Sin costo — demostración'
        tiempoRespuesta = '5 días hábiles — demostración'
        requiereReserva = $dato.reserva
        activo = $true
        version = $null
    }
    $tramitesActuales += $tramite
    Incrementar-Resultado 'tramites'
}

$rolesActuales = @(Invocar-ApiLocal -Ruta '/administracion/roles' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
$permisos = @(Invocar-ApiLocal -Ruta '/administracion/permisos' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin)
$permisoLectura = @($permisos | Where-Object { $_.codigo -eq 'EVENTOLEER' } | Select-Object -First 1)
if ($permisoLectura.Count -eq 0) { throw 'No se encontró el permiso EVENTOLEER para crear los roles de demostración.' }
$datosPersonal = @(
    [PSCustomObject]@{ rol = 'Demostración | Coordinación de eventos'; nombre = 'Carla'; apellido = 'Marroquín'; correo = 'demo.coordinacion.eventos@parque.local' },
    [PSCustomObject]@{ rol = 'Demostración | Comunicación'; nombre = 'Diego'; apellido = 'Pérez'; correo = 'demo.comunicacion@parque.local' },
    [PSCustomObject]@{ rol = 'Demostración | Atención ciudadana'; nombre = 'Lucía'; apellido = 'Gómez'; correo = 'demo.atencion@parque.local' },
    [PSCustomObject]@{ rol = 'Demostración | Inventario'; nombre = 'Mateo'; apellido = 'Castillo'; correo = 'demo.inventario@parque.local' },
    [PSCustomObject]@{ rol = 'Demostración | Áreas deportivas'; nombre = 'Sofía'; apellido = 'Ramírez'; correo = 'demo.areas@parque.local' }
)
foreach ($dato in $datosPersonal) {
    $rol = Obtener-Primero -Coleccion $rolesActuales -Propiedad 'nombre' -Valor $dato.rol
    if ($null -eq $rol) {
        $rol = Invocar-ApiLocal -Ruta '/administracion/roles' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
            nombre = $dato.rol
            descripcion = 'Rol de demostración para validar la administración de usuarios y roles.'
            codigosPermisos = @($permisoLectura[0].codigo)
        }
        $rolesActuales += $rol
        Incrementar-Resultado 'roles'
    }
}

$paginaUsuarios = Invocar-ApiLocal -Ruta '/administracion/usuarios?pagina=0&tamano=50' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$usuariosActuales = @($paginaUsuarios.contenido)
$contrasenaEmpleadoDemo = 'Demostracion-Temporal-2026!'
foreach ($dato in $datosPersonal) {
    if ($null -ne (Obtener-Primero -Coleccion $usuariosActuales -Propiedad 'correo' -Valor $dato.correo)) { continue }
    $rol = Obtener-Primero -Coleccion $rolesActuales -Propiedad 'nombre' -Valor $dato.rol
    $empleado = Invocar-ApiLocal -Ruta '/administracion/empleados' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin -Metodo POST -Datos @{
        nombre = $dato.nombre
        apellido = $dato.apellido
        correo = $dato.correo
        contrasenaInicial = $contrasenaEmpleadoDemo
        codigosRoles = @($rol.codigo)
    }
    $usuariosActuales += $empleado
    Incrementar-Resultado 'empleados'
}

$usuarioPrueba = Nueva-SesionAutenticada -Correo $CorreoUsuarioPrueba -Contrasena $ContrasenaUsuarioPrueba
$sesionUsuario = $usuarioPrueba.Sesion
$encabezadosUsuario = $usuarioPrueba.Encabezados
$solicitudesAntes = Invocar-ApiLocal -Ruta '/solicitudes/mias?grupo=TODOS&pagina=0&tamano=20' -Sesion $sesionUsuario -Encabezados $encabezadosUsuario
$asuntosExistentes = @()
foreach ($resumenSolicitud in @($solicitudesAntes.contenido)) {
    $detalleSolicitud = Invocar-ApiLocal -Ruta "/solicitudes/$($resumenSolicitud.idSolicitud)" -Sesion $sesionUsuario -Encabezados $encabezadosUsuario
    if ($null -ne $detalleSolicitud.detalle -and -not [string]::IsNullOrWhiteSpace($detalleSolicitud.detalle.asunto)) {
        $asuntosExistentes += $detalleSolicitud.detalle.asunto
    }
}
$datosSolicitudes = @(
    @{ tipo = 'QUEJA'; asunto = 'Demostración | Iluminación del acceso peatonal'; descripcion = 'Solicitud de prueba: se requiere revisar una luminaria cercana al acceso peatonal al finalizar la jornada deportiva.' },
    @{ tipo = 'DENUNCIA'; asunto = 'Demostración | Residuos en área común'; descripcion = 'Solicitud de prueba: se observan residuos junto a una zona de descanso y se solicita verificación de limpieza.' },
    @{ tipo = 'QUEJA'; asunto = 'Demostración | Señalización de la pista'; descripcion = 'Solicitud de prueba: se solicita revisar la señalización informativa para orientar a las personas usuarias de la pista.' }
)
$solicitudesCreadas = @()
foreach ($dato in $datosSolicitudes) {
    if ($dato.asunto -in $asuntosExistentes) { continue }
    $solicitud = Invocar-ApiLocal -Ruta '/solicitudes/denuncias-quejas' -Sesion $sesionUsuario -Encabezados $encabezadosUsuario -Metodo POST -Datos $dato
    if ($solicitud.estado -eq 'BORRADOR') { throw "La solicitud de prueba $($solicitud.idSolicitud) no fue enviada." }
    $solicitudesCreadas += $solicitud
    Incrementar-Resultado 'solicitudesUsuario'
}
$solicitudesDespues = Invocar-ApiLocal -Ruta '/solicitudes/mias?grupo=TODOS&pagina=0&tamano=20' -Sesion $sesionUsuario -Encabezados $encabezadosUsuario
if ([int64]$solicitudesDespues.totalElementos -lt ([int64]$solicitudesAntes.totalElementos + $solicitudesCreadas.Count)) {
    throw 'Las solicitudes de demostración no quedaron disponibles para el usuario de prueba.'
}

$solicitudesAdministradas = Invocar-ApiLocal -Ruta '/administracion/solicitudes?pagina=0&tamano=50' -Sesion $sesionAdmin -Encabezados $encabezadosAdmin
$idsCreados = @($solicitudesCreadas | ForEach-Object { $_.idSolicitud })
$idsAdministracion = @($solicitudesAdministradas.contenido | ForEach-Object { $_.idSolicitud })
if (@($idsCreados | Where-Object { $_ -notin $idsAdministracion }).Count -gt 0) {
    throw 'Las solicitudes de prueba no aparecen en la consulta administrativa.'
}

[PSCustomObject]@{
    resultado = $resultado
    solicitudesPrueba = @($solicitudesCreadas | ForEach-Object { [PSCustomObject]@{ idSolicitud = $_.idSolicitud; estado = $_.estado } })
    usuarioPrueba = $usuarioPrueba.Perfil.correo
    validaciones = @('sesión administrativa', 'creación por API', 'publicación de contenidos', 'consulta administrativa de solicitudes', 'consulta de solicitudes del usuario')
} | ConvertTo-Json -Depth 8
