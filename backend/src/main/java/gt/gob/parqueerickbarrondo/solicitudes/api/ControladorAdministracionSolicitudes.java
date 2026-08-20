package gt.gob.parqueerickbarrondo.solicitudes.api;

import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaSolicitudAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudResolucionAdministrativa;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudVersionSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioAdministracionSolicitudes;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/administracion/solicitudes")
public class ControladorAdministracionSolicitudes {

    private final ServicioAdministracionSolicitudes servicio;

    public ControladorAdministracionSolicitudes(ServicioAdministracionSolicitudes servicio) {
        this.servicio = servicio;
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
