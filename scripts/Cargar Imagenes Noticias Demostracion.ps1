[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CorreoAdministrador,

    [Parameter(Mandatory)]
    [string]$ContrasenaAdministrador,

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
        [ValidateSet('GET', 'POST', 'PUT', 'DELETE')] [string]$Metodo = 'GET',
        [object]$Datos
    )

    $parametros = @{
        Uri = "$UrlApi$Ruta"
        Method = $Metodo
        WebSession = $Sesion
        TimeoutSec = 30
        ErrorAction = 'Stop'
    }
    if ($Encabezados.Count -gt 0) { $parametros.Headers = $Encabezados }
    if ($null -ne $Datos) {
        $parametros.ContentType = 'application/json'
        $parametros.Body = Convertir-CuerpoJson $Datos
    }
    Invoke-RestMethod @parametros
}

function Subir-ArchivoLocal {
    param(
        [Parameter(Mandatory)] [string]$Ruta,
        [Parameter(Mandatory)] [string]$Archivo,
        [Parameter(Mandatory)] [Microsoft.PowerShell.Commands.WebRequestSession]$Sesion,
        [hashtable]$Encabezados = @{}
    )

    Invoke-RestMethod -Uri "$UrlApi$Ruta" -Method Post -WebSession $Sesion -Headers $Encabezados `
        -Form @{ archivo = Get-Item -LiteralPath $Archivo } -TimeoutSec 60 -ErrorAction Stop
}

function Nueva-SesionAdministrativa {
    param([string]$Correo, [string]$Contrasena)

    $sesion = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $csrf = Invoke-RestMethod -Uri "$UrlApi/autenticacion/csrf" -WebSession $sesion -TimeoutSec 15
    $encabezados = @{ $csrf.nombreEncabezado = $csrf.token }
    [void](Invocar-ApiLocal -Ruta '/autenticacion/iniciar-sesion' -Sesion $sesion -Encabezados $encabezados -Metodo POST -Datos @{
        correo = $Correo
        contrasena = $Contrasena
        mantenerSesionActiva = $false
    })
    [PSCustomObject]@{ Sesion = $sesion; Encabezados = $encabezados }
}

$imagenesNoticias = @(
    [PSCustomObject]@{
        titulo = 'Demostración | Torneo Nacional de Verano 2026 en el parque'
        archivo = 'demo-torneo-atletismo.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Track_Athletes_-_Tulane_University_runners%2C_New_Orleans_2007.jpg/1920px-Track_Athletes_-_Tulane_University_runners%2C_New_Orleans_2007.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File%3ATrack%20Athletes%20-%20Tulane%20University%20runners%2C%20New%20Orleans%202007.jpg'
        credito = 'Tulane Public Relations, CC BY 2.0'
    },
    [PSCustomObject]@{
        titulo = 'Demostración | Campeonato de Guatemala de Atletismo 2026'
        archivo = 'demo-campeonato-atletismo.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/RLZ_Athletics_stadium_05.JPG/1920px-RLZ_Athletics_stadium_05.JPG'
        fuente = 'https://commons.wikimedia.org/wiki/File%3ARLZ%20Athletics%20stadium%2005.JPG'
        credito = 'Neukoln, CC BY-SA 3.0'
    },
    [PSCustomObject]@{
        titulo = 'Demostración | Recorrido en bicicleta 2026 con punto de encuentro en el parque'
        archivo = 'demo-recorrido-ciclismo.jpg'
        descarga = 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Bicycle_at_the_Cycling_Event%2C_Priory_Park_-_geograph.org.uk_-_556628.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File%3ABicycle%20at%20the%20Cycling%20Event%2C%20Priory%20Park%20-%20geograph.org.uk%20-%20556628.jpg'
        credito = 'Bob Embleton, CC BY-SA 2.0'
    },
    [PSCustomObject]@{
        titulo = 'Demostración | Espacios deportivos y recreativos del parque'
        archivo = 'demo-espacios-parque.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Tai_Shui_Hang_Cycle_Park_20120806.jpg/1920px-Tai_Shui_Hang_Cycle_Park_20120806.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File%3ATai%20Shui%20Hang%20Cycle%20Park%2020120806.jpg'
        credito = 'Wing1990hk, CC BY 3.0'
    },
    [PSCustomObject]@{
        titulo = 'Demostración | Referencia de academia infantil de béisbol'
        archivo = 'demo-academia-beisbol.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/HMLA-169_Marines_play_baseball_with_local_youth_baseball_team_%289269186%29.jpg/1920px-HMLA-169_Marines_play_baseball_with_local_youth_baseball_team_%289269186%29.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File%3AHMLA-169%20Marines%20play%20baseball%20with%20local%20youth%20baseball%20team%20%289269186%29.jpg'
        credito = 'U.S. Marines 1MAW / Lance Cpl. Thalia Rivera, dominio público'
    }
)

$administrador = Nueva-SesionAdministrativa -Correo $CorreoAdministrador -Contrasena $ContrasenaAdministrador
$sesion = $administrador.Sesion
$encabezados = $administrador.Encabezados
$publicaciones = @(Invocar-ApiLocal -Ruta '/administracion/publicaciones?pagina=0&tamano=50&orden=ACTUALIZACION' -Sesion $sesion -Encabezados $encabezados).contenido
$directorioTemporal = Join-Path $env:TEMP 'parque-imagenes-demostracion'
New-Item -ItemType Directory -Force -Path $directorioTemporal | Out-Null

$resultado = [ordered]@{ imagenesCargadas = 0; portadasActualizadas = 0; imagenesProvisionalesEliminadas = 0; creditosAgregados = 0 }
foreach ($dato in $imagenesNoticias) {
    $publicacion = @($publicaciones | Where-Object { $_.titulo -eq $dato.titulo }) | Select-Object -First 1
    if ($null -eq $publicacion) { throw "No se encontró la publicación «$($dato.titulo)»." }

    $archivo = Join-Path $directorioTemporal $dato.archivo
    if (-not (Test-Path -LiteralPath $archivo -PathType Leaf)) {
        Invoke-WebRequest -Uri $dato.descarga -OutFile $archivo -TimeoutSec 60
    }

    $imagenes = @(Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/imagenes" -Sesion $sesion -Encabezados $encabezados)
    $imagenReal = @($imagenes | Where-Object { $_.nombreArchivoOriginal -eq $dato.archivo }) | Select-Object -First 1
    if ($null -eq $imagenReal) {
        $imagenReal = Subir-ArchivoLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/imagenes" -Archivo $archivo -Sesion $sesion -Encabezados $encabezados
        $resultado.imagenesCargadas++
        $imagenes += $imagenReal
    }

    if ([int]$imagenReal.ordenVisualizacion -ne 0) {
        [void](Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/imagenes/$($imagenReal.idImagenPublicacion)/portada" -Sesion $sesion -Encabezados $encabezados -Metodo PUT)
        $resultado.portadasActualizadas++
    }

    foreach ($imagen in $imagenes | Where-Object { $_.idImagenPublicacion -ne $imagenReal.idImagenPublicacion }) {
        [void](Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)/imagenes/$($imagen.idImagenPublicacion)" -Sesion $sesion -Encabezados $encabezados -Metodo DELETE)
        $resultado.imagenesProvisionalesEliminadas++
    }

    $publicacion = Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)" -Sesion $sesion -Encabezados $encabezados
    $lineaCredito = "Crédito de imagen: $($dato.credito). Fuente: $($dato.fuente)"
    if ($publicacion.contenido -notlike "*$($dato.fuente)*") {
        [void](Invocar-ApiLocal -Ruta "/administracion/publicaciones/$($publicacion.idPublicacion)" -Sesion $sesion -Encabezados $encabezados -Metodo PUT -Datos @{
            idCategoriaPublicacion = $publicacion.idCategoriaPublicacion
            titulo = $publicacion.titulo
            resumen = $publicacion.resumen
            contenido = "$($publicacion.contenido)`n`n$lineaCredito"
            fechaEditorial = $publicacion.fechaEditorial
            version = $publicacion.version
        })
        $resultado.creditosAgregados++
    }
}

$publicas = @(Invocar-ApiLocal -Ruta '/publico/publicaciones?pagina=0&tamano=50' -Sesion $sesion -Encabezados $encabezados).contenido
$publicacionesConImagen = @($publicas | Where-Object { $_.titulo -like 'Demostración*' -and $null -ne $_.imagenPrincipal }).Count
if ($publicacionesConImagen -lt $imagenesNoticias.Count) { throw 'No todas las noticias de demostración tienen una portada pública.' }

[PSCustomObject]@{
    resultado = $resultado
    noticiasDemostracionConImagen = $publicacionesConImagen
    fuentes = @($imagenesNoticias | ForEach-Object { [PSCustomObject]@{ titulo = $_.titulo; fuente = $_.fuente; credito = $_.credito } })
} | ConvertTo-Json -Depth 8
