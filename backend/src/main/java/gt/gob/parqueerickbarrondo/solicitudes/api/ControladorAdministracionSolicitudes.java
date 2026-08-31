package gt.gob.parqueerickbarrondo.solicitudes.api;

import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaSolicitudAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudResolucionAdministrativa;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudVersionSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaTramiteAdministrado;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaCategoriaTramiteAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudCategoriaTramiteAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudTramiteAdministrado;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioCatalogoTramites;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioAdministracionSolicitudes;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/v1/administracion/solicitudes")
public class ControladorAdministracionSolicitudes {

    private final ServicioAdministracionSolicitudes servicio;
    private final ServicioCatalogoTramites catalogo;

    public ControladorAdministracionSolicitudes(ServicioAdministracionSolicitudes servicio,
            ServicioCatalogoTramites catalogo) {
        this.servicio = servicio;
        this.catalogo = catalogo;
    }

    @GetMapping("/catalogo")
    public java.util.List<RespuestaTramiteAdministrado> listarCatalogo() {
        return catalogo.listarAdministracion();
    }

    @GetMapping("/catalogo/categorias")
    public java.util.List<RespuestaCategoriaTramiteAdministrada> listarCategoriasCatalogo() {
        return catalogo.listarCategoriasAdministracion();
    }

    @PostMapping("/catalogo/categorias")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaCategoriaTramiteAdministrada crearCategoriaCatalogo(
            @AuthenticationPrincipal UsuarioSesion actor,
            @Valid @RequestBody SolicitudCategoriaTramiteAdministrada solicitud) {
        return catalogo.crearCategoria(actor.obtenerIdUsuario(), solicitud);
    }

    @PostMapping("/catalogo")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaTramiteAdministrado crearTramite(
            @AuthenticationPrincipal UsuarioSesion actor,
            @Valid @RequestBody SolicitudTramiteAdministrado solicitud) {
        return catalogo.crearTramite(actor.obtenerIdUsuario(), solicitud);
    }

    @PutMapping("/catalogo/{idTramite}")
    public RespuestaTramiteAdministrado actualizarTramite(
            @PathVariable Long idTramite,
            @AuthenticationPrincipal UsuarioSesion actor,
            @Valid @RequestBody SolicitudTramiteAdministrado solicitud) {
        return catalogo.actualizar(idTramite, actor.obtenerIdUsuario(), solicitud);
    }

    @PostMapping(value = "/catalogo/{idTramite}/portada", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RespuestaTramiteAdministrado actualizarPortada(
            @PathVariable Long idTramite,
            @AuthenticationPrincipal UsuarioSesion actor,
            @RequestParam org.springframework.web.multipart.MultipartFile archivo) {
        return catalogo.actualizarPortada(idTramite, actor.obtenerIdUsuario(), archivo);
    }

    @GetMapping
    public RespuestaPaginaPublica<RespuestaSolicitudAdministrada> listar(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicio.listar(busqueda, estado, pagina, tamano);
    }

    @GetMapping("/{idSolicitud}")
    public RespuestaDetalleSolicitud consultar(@PathVariable Long idSolicitud) {
        return servicio.consultar(idSolicitud);
    }

    @PostMapping("/{idSolicitud}/iniciar-revision")
    public RespuestaDetalleSolicitud iniciarRevision(
            @PathVariable Long idSolicitud,
            @Valid @RequestBody SolicitudVersionSolicitud solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicio.iniciarRevision(idSolicitud, solicitud.version(), actor);
    }

    @PostMapping("/{idSolicitud}/resolver")
    public RespuestaDetalleSolicitud resolver(
            @PathVariable Long idSolicitud,
            @Valid @RequestBody SolicitudResolucionAdministrativa solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicio.resolver(idSolicitud, solicitud, actor);
    }

    @GetMapping("/{idSolicitud}/documentos/{idDocumentoSolicitud}/archivo")
    public ResponseEntity<org.springframework.core.io.Resource> cargarDocumento(
            @PathVariable Long idSolicitud,
            @PathVariable Long idDocumentoSolicitud) {
        var archivo = servicio.cargarDocumento(idSolicitud, idDocumentoSolicitud);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(archivo.tipoMedio()))
                .contentLength(archivo.tamanoBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(archivo.nombreArchivo()).build().toString())
                .body(archivo.recurso());
    }
}
