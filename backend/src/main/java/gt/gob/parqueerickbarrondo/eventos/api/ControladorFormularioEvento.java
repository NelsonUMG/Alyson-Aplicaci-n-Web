package gt.gob.parqueerickbarrondo.eventos.api;

import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioFormularioEvento;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ArchivoDocumentoSolicitud;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ControladorFormularioEvento {
    private final ServicioFormularioEvento servicio;
    public ControladorFormularioEvento(ServicioFormularioEvento servicio) { this.servicio = servicio; }

    @PostMapping(value = "/api/v1/administracion/eventos/{idEvento}/formulario-inscripcion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ServicioFormularioEvento.RespuestaFormulario guardar(@PathVariable Long idEvento,
            @RequestParam MultipartFile archivo, @AuthenticationPrincipal UsuarioSesion actor) {
        return servicio.guardar(idEvento, archivo, actor);
    }

    @DeleteMapping("/api/v1/administracion/eventos/{idEvento}/formulario-inscripcion")
    public ServicioFormularioEvento.RespuestaFormulario eliminar(@PathVariable Long idEvento,
            @AuthenticationPrincipal UsuarioSesion actor) { return servicio.eliminar(idEvento, actor); }

    @GetMapping("/api/v1/administracion/eventos/{idEvento}/formulario-inscripcion")
    public ResponseEntity<Resource> cargarAdministrado(@PathVariable Long idEvento) {
        return descargar(servicio.cargarAdministrado(idEvento));
    }

    @GetMapping("/api/v1/publico/eventos/{identificadorUrl}/formulario-inscripcion")
    public ResponseEntity<Resource> cargarPublico(@PathVariable String identificadorUrl) {
        return descargar(servicio.cargarPublico(identificadorUrl));
    }

    private ResponseEntity<Resource> descargar(ArchivoDocumentoSolicitud archivo) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).contentLength(archivo.tamanoBytes())
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("formulario-inscripcion.pdf").build().toString())
                .body(archivo.recurso());
    }
}
