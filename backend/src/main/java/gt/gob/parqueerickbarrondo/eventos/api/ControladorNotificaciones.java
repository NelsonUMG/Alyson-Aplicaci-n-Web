package gt.gob.parqueerickbarrondo.eventos.api;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaNotificacion;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaNotificaciones;
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioNotificaciones;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notificaciones")
public class ControladorNotificaciones {
    private final ServicioNotificaciones servicio;

    public ControladorNotificaciones(ServicioNotificaciones servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public RespuestaNotificaciones listar(@AuthenticationPrincipal UsuarioSesion usuario) {
        return servicio.listar(usuario.obtenerIdUsuario());
    }

    @PutMapping("/{idNotificacion}/leida")
    public RespuestaNotificacion marcarLeida(
            @PathVariable Long idNotificacion,
            @AuthenticationPrincipal UsuarioSesion usuario) {
        return servicio.marcarLeida(usuario.obtenerIdUsuario(), idNotificacion);
    }
}
