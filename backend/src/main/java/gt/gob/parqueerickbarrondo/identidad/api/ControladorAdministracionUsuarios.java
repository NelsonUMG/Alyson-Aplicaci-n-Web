package gt.gob.parqueerickbarrondo.identidad.api;

import java.util.List;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPagina;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaRol;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaUsuarioAdministrado;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudActualizacionRoles;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAdministracionUsuarios;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/administracion")
public class ControladorAdministracionUsuarios {

    private final ServicioAdministracionUsuarios servicioAdministracion;

    public ControladorAdministracionUsuarios(ServicioAdministracionUsuarios servicioAdministracion) {
        this.servicioAdministracion = servicioAdministracion;
    }

    @GetMapping("/usuarios")
    public RespuestaPagina<RespuestaUsuarioAdministrado> listarUsuarios(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioAdministracion.listar(busqueda, pagina, tamano);
    }

    @GetMapping("/roles")
    public List<RespuestaRol> listarRoles() {
        return servicioAdministracion.listarRoles();
    }

    @PutMapping("/usuarios/{idUsuario}/roles")
    public RespuestaUsuarioAdministrado actualizarRoles(
            @PathVariable Long idUsuario,
            @Valid @RequestBody SolicitudActualizacionRoles solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarRoles(idUsuario, solicitud, actor);
    }
}
