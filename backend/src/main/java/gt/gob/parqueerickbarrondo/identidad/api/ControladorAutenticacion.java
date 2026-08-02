package gt.gob.parqueerickbarrondo.identidad.api;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaCsrf;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaMensaje;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPerfil;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudCambioContrasena;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudInicioSesion;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAutenticacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/autenticacion")
public class ControladorAutenticacion {

    private static final String MENSAJE_REGISTRO =
            "Si los datos son elegibles, la cuenta quedará disponible según la política institucional.";

    private final ServicioRegistroCuenta servicioRegistroCuenta;
    private final ServicioAutenticacion servicioAutenticacion;

    public ControladorAutenticacion(
            ServicioRegistroCuenta servicioRegistroCuenta,
            ServicioAutenticacion servicioAutenticacion) {
        this.servicioRegistroCuenta = servicioRegistroCuenta;
        this.servicioAutenticacion = servicioAutenticacion;
    }

    @GetMapping("/csrf")
    public RespuestaCsrf obtenerCsrf(CsrfToken token) {
        return new RespuestaCsrf(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    @PostMapping("/registro")
    public ResponseEntity<RespuestaMensaje> registrar(@Valid @RequestBody SolicitudRegistroCuenta solicitud) {
        try {
            servicioRegistroCuenta.registrar(solicitud);
        }
        catch (DataIntegrityViolationException ignorada) {
            // La respuesta permanece genérica ante una carrera por correo duplicado.
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new RespuestaMensaje(MENSAJE_REGISTRO));
    }

    @PostMapping("/iniciar-sesion")
    public RespuestaPerfil iniciarSesion(
            @Valid @RequestBody SolicitudInicioSesion solicitud,
            HttpServletRequest peticion,
            HttpServletResponse respuesta) {
        return servicioAutenticacion.iniciarSesion(solicitud, peticion, respuesta);
    }

    @GetMapping("/perfil")
    public RespuestaPerfil obtenerPerfil(@AuthenticationPrincipal UsuarioSesion usuarioSesion) {
        return servicioAutenticacion.obtenerPerfil(usuarioSesion);
    }

    @PutMapping("/contrasena")
    public ResponseEntity<Void> cambiarContrasena(
            @AuthenticationPrincipal UsuarioSesion usuarioSesion,
            @Valid @RequestBody SolicitudCambioContrasena solicitud,
            HttpServletRequest peticion) {
        servicioAutenticacion.cambiarContrasena(usuarioSesion, solicitud, peticion.getSession());
        return ResponseEntity.noContent().build();
    }
}
