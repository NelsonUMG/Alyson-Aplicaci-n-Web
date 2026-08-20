package gt.gob.parqueerickbarrondo.solicitudes.api;

import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaPaginaSolicitudesUsuario;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDocumentoSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaProcedimientoUsoInstalacion;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudUsoInstalacion;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudVersionSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioSolicitudesUsuario;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/solicitudes")
public class ControladorSolicitudesUsuario {

    private final ServicioSolicitudesUsuario servicioSolicitudes;

    public ControladorSolicitudesUsuario(ServicioSolicitudesUsuario servicioSolicitudes) {
        this.servicioSolicitudes = servicioSolicitudes;
    }

    @GetMapping("/mias")
    public RespuestaPaginaSolicitudesUsuario listarMias(
            @AuthenticationPrincipal UsuarioSesion usuario,
            @RequestParam(defaultValue = "ENPROCESO") String grupo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano) {
        return servicioSolicitudes.listar(usuario.obtenerIdUsuario(), grupo, pagina, tamano);
    }

    @GetMapping("/procedimientos/uso-instalacion")
    public RespuestaProcedimientoUsoInstalacion consultarProcedimiento() {
        return servicioSolicitudes.consultarProcedimiento();
    }

    @PostMapping("/uso-instalacion/borradores")
    public ResponseEntity<RespuestaDetalleSolicitud> crearBorrador(
            @AuthenticationPrincipal UsuarioSesion usuario,
            @Valid @RequestBody SolicitudUsoInstalacion solicitud) {
        return ResponseEntity.status(201)
                .body(servicioSolicitudes.crearBorrador(usuario.obtenerIdUsuario(), solicitud));
    }

    @PutMapping("/{idSolicitud}/borrador")
    public RespuestaDetalleSolicitud actualizarBorrador(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal UsuarioSesion usuario,
            @Valid @RequestBody SolicitudUsoInstalacion solicitud) {
        return servicioSolicitudes.actualizarBorrador(
                idSolicitud, usuario.obtenerIdUsuario(), solicitud);
    }

    @GetMapping("/{idSolicitud}")
    public RespuestaDetalleSolicitud consultar(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal UsuarioSesion usuario) {
        return servicioSolicitudes.consultar(idSolicitud, usuario.obtenerIdUsuario());
    }

    @PostMapping(value = "/{idSolicitud}/documentos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RespuestaDocumentoSolicitud> agregarDocumento(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal UsuarioSesion usuario,
            @RequestParam MultipartFile archivo) {
        return ResponseEntity.status(201).body(servicioSolicitudes.agregarDocumento(
                idSolicitud, usuario.obtenerIdUsuario(), archivo));
    }

    @DeleteMapping("/{idSolicitud}/documentos/{idDocumentoSolicitud}")
    public ResponseEntity<Void> eliminarDocumento(
            @PathVariable Long idSolicitud,
            @PathVariable Long idDocumentoSolicitud,
            @AuthenticationPrincipal UsuarioSesion usuario) {
        servicioSolicitudes.eliminarDocumento(
                idSolicitud, idDocumentoSolicitud, usuario.obtenerIdUsuario());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{idSolicitud}/documentos/{idDocumentoSolicitud}/archivo")
    public ResponseEntity<org.springframework.core.io.Resource> cargarDocumento(
            @PathVariable Long idSolicitud,
            @PathVariable Long idDocumentoSolicitud,
            @AuthenticationPrincipal UsuarioSesion usuario) {
        var archivo = servicioSolicitudes.cargarDocumento(
                idSolicitud, idDocumentoSolicitud, usuario.obtenerIdUsuario());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(archivo.tipoMedio()))
                .contentLength(archivo.tamanoBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(archivo.nombreArchivo()).build().toString())
                .body(archivo.recurso());
    }

    @PostMapping("/{idSolicitud}/enviar")
    public RespuestaDetalleSolicitud enviar(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal UsuarioSesion usuario,
            @Valid @RequestBody SolicitudVersionSolicitud solicitud) {
        return servicioSolicitudes.enviar(
                idSolicitud, usuario.obtenerIdUsuario(), solicitud.version());
    }
}
