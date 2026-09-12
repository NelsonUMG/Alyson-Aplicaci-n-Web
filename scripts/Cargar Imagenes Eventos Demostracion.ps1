[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$CorreoAdministrador,
    [Parameter(Mandatory)] [string]$ContrasenaAdministrador,
    [string]$UrlApi = 'http://127.0.0.1:8080/api/v1'
)
$ErrorActionPreference = 'Stop'
if (([uri]$UrlApi).Host -notin @('localhost', '127.0.0.1', '::1')) { throw 'Este cargador está limitado al sistema local de pruebas.' }

$imagenes = @(
    @{
        titulo = 'Patinaje'; archivo = 'evento-patinaje.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/INLINE_SKATE.jpg/1280px-INLINE_SKATE.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File:INLINE_SKATE.jpg'
        credito = 'Ganjarmustika1904, CC BY-SA 4.0'
        licencia = 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    @{
        titulo = 'Demostración | Curso deportivo gratuito'; archivo = 'demo-torneo-atletismo.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Track_Athletes_-_Tulane_University_runners%2C_New_Orleans_2007.jpg/1920px-Track_Athletes_-_Tulane_University_runners%2C_New_Orleans_2007.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File:Track_Athletes_-_Tulane_University_runners,_New_Orleans_2007.jpg'
        credito = 'Tulane Public Relations, CC BY 2.0'
        licencia = 'https://creativecommons.org/licenses/by/2.0/'
    },
    @{
        titulo = 'Demostración | Superclase de yoga'; archivo = 'evento-yoga.jpg'
        descarga = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Yoga_in_the_Park_%28c897f532-6971-4776-8e62-95961beb491d%29.jpg/1280px-Yoga_in_the_Park_%28c897f532-6971-4776-8e62-95961beb491d%29.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File:Yoga_in_the_Park_(c897f532-6971-4776-8e62-95961beb491d).jpg'
        credito = 'National Park Service (NPS), dominio público'; licencia = ''
    },
    @{
        titulo = 'Demostración | Jornada de ciclovía familiar'; archivo = 'demo-recorrido-ciclismo.jpg'
        descarga = 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Bicycle_at_the_Cycling_Event%2C_Priory_Park_-_geograph.org.uk_-_556628.jpg'
        fuente = 'https://commons.wikimedia.org/wiki/File:Bicycle_at_the_Cycling_Event,_Priory_Park_-_geograph.org.uk_-_556628.jpg'
        credito = 'Bob Embleton, CC BY-SA 2.0'
        licencia = 'https://creativecommons.org/licenses/by-sa/2.0/'
    }
)
$sesion = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$csrf = Invoke-RestMethod "$UrlApi/autenticacion/csrf" -WebSession $sesion
$encabezados = @{ $csrf.nombreEncabezado = $csrf.token }
function Api {
    param([string]$Ruta, [string]$Metodo = 'GET', [object]$Datos)
    $parametros = @{ Uri = "$UrlApi$Ruta"; Method = $Metodo; WebSession = $sesion; Headers = $encabezados; TimeoutSec = 30 }
    if ($null -ne $Datos) {
        $parametros.ContentType = 'application/json; charset=utf-8'
        $parametros.Body = [System.Text.Encoding]::UTF8.GetBytes(($Datos | ConvertTo-Json -Depth 20 -Compress))
    }
    Invoke-RestMethod @parametros
}
[void](Api '/autenticacion/iniciar-sesion' 'POST' @{ correo = $CorreoAdministrador; contrasena = $ContrasenaAdministrador; mantenerSesionActiva = $false })
$csrf = Invoke-RestMethod "$UrlApi/autenticacion/csrf" -WebSession $sesion
$encabezados = @{ $csrf.nombreEncabezado = $csrf.token }
$eventos = (Api '/administracion/eventos?pagina=0&tamano=50').contenido
$temporal = Join-Path $env:TEMP 'parque-imagenes-demostracion'
$respaldo = Join-Path $PSScriptRoot '../output/respaldo-imagenes-eventos'
New-Item -ItemType Directory -Force -Path $temporal, $respaldo | Out-Null
$resultados = @()
foreach ($imagen in $imagenes) {
    $coincidencias = @($eventos | Where-Object titulo -eq $imagen.titulo)
    if ($coincidencias.Count -ne 1) { throw "No se encontró un único evento: $($imagen.titulo)" }
    $idEvento = $coincidencias[0].idEvento
    $evento = Api "/administracion/eventos/$idEvento"
    if ($evento.urlImagen -and $evento.descripcion.Contains($imagen.fuente)) {
        $resultados += @{ idEvento = $idEvento; titulo = $evento.titulo; resultado = 'Ya tiene fotografía y crédito' }
        continue
    }
    $metadatos = Join-Path $respaldo "evento-$idEvento.json"
    if (-not (Test-Path -LiteralPath $metadatos)) {
        $evento | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $metadatos -Encoding utf8
        if ($evento.urlImagen) {
            Invoke-WebRequest "$UrlApi/administracion/eventos/$idEvento/imagen" -WebSession $sesion -OutFile (Join-Path $respaldo "evento-$idEvento-imagen-original")
        }
    }
    $archivo = Join-Path $temporal $imagen.archivo
    if (-not (Test-Path -LiteralPath $archivo)) { Invoke-WebRequest $imagen.descarga -OutFile $archivo -TimeoutSec 60 }
    [void](Invoke-RestMethod "$UrlApi/administracion/eventos/$idEvento/imagen" -Method Post -WebSession $sesion -Headers $encabezados -Form @{ archivo = Get-Item -LiteralPath $archivo } -TimeoutSec 60)
    $evento = Api "/administracion/eventos/$idEvento"
    $datos = @{}
    foreach ($campo in @('titulo','descripcion','lugar','iniciaEn','finalizaEn','inscripcionAbreEn','inscripcionCierraEn','capacidadTotal','esquemaFormularioJson','configuracionGruposJson','requisitos','version')) { $datos[$campo] = $evento.$campo }
    if (-not $evento.descripcion.Contains($imagen.fuente)) {
        $datos.descripcion += "`n`nFotografía ilustrativa: $($imagen.credito). Fuente: $($imagen.fuente)"
        if ($imagen.licencia) { $datos.descripcion += "`nLicencia: $($imagen.licencia)" }
    }
    [void](Api "/administracion/eventos/$idEvento" 'PUT' $datos)
    $publico = Api "/publico/eventos/$($evento.identificadorUrl)"
    if (-not $publico.urlImagen) { throw "La portada del evento $idEvento no es pública." }
    $resultados += @{ idEvento = $idEvento; titulo = $evento.titulo; resultado = 'Fotografía publicada con crédito'; fuente = $imagen.fuente }
}
$resultados | ConvertTo-Json -Depth 5
