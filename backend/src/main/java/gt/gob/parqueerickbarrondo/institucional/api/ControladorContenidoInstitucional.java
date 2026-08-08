package gt.gob.parqueerickbarrondo.institucional.api;

import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.institucional.api.modelo.RespuestaContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.api.modelo.SolicitudContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.aplicacion.ServicioContenidoInstitucional;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ControladorContenidoInstitucional {

    private final ServicioContenidoInstitucional servicioContenido;

    public ControladorContenidoInstitucional(ServicioContenidoInstitucional servicioContenido) {
        this.servicioContenido = servicioContenido;
    }

    @GetMapping("/api/v1/publico/institucional")
    public RespuestaContenidoInstitucional consultarPublico() {
        return servicioContenido.consultarPublico();
    }

    @GetMapping("/api/v1/administracion/institucional")
    public RespuestaContenidoInstitucional consultarAdministracion() {
        return servicioContenido.consultarAdministracion();
    }

    @PutMapping("/api/v1/administracion/institucional")
    public RespuestaContenidoInstitucional actualizar(
            @Valid @RequestBody SolicitudContenidoInstitucional solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioContenido.actualizar(solicitud, actor);
    }
}
