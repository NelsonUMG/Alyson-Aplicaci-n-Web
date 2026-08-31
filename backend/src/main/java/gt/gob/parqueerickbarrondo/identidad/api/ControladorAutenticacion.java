package gt.gob.parqueerickbarrondo.identidad.api;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaCsrf;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaMensaje;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPerfil;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudActualizacionPerfil;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudCambioContrasena;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudConfirmacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudInicioSesion;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudReenvioVerificacion;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAutenticacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioPerfilUsuario;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioVerificacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/autenticacion")
public class ControladorAutenticacion {

    private static final String MENSAJE_REGISTRO =
            "Cuenta creada. Revisa tu correo para confirmar la dirección y habilitar el acceso.";
    private static final String MENSAJE_REGISTRO_SIN_CORREO =
            "Cuenta creada y pendiente de verificación. No pudimos enviar el correo; solicita un enlace nuevo en unos minutos.";
    private static final String MENSAJE_REENVIO =
            "Si la cuenta está pendiente, enviamos un nuevo enlace de verificación.";

    private final ServicioRegistroCuenta servicioRegistroCuenta;
    private final ServicioAutenticacion servicioAutenticacion;
    private final ServicioVerificacionCorreo servicioVerificacionCorreo;
    private final ServicioPerfilUsuario servicioPerfilUsuario;

    public ControladorAutenticacion(
            ServicioRegistroCuenta servicioRegistroCuenta,
            ServicioAutenticacion servicioAutenticacion,
            ServicioVerificacionCorreo servicioVerificacionCorreo,
            ServicioPerfilUsuario servicioPerfilUsuario) {
        this.servicioRegistroCuenta = servicioRegistroCuenta;
        this.servicioAutenticacion = servicioAutenticacion;
        this.servicioVerificacionCorreo = servicioVerificacionCorreo;
        this.servicioPerfilUsuario = servicioPerfilUsuario;
    }

    @GetMapping("/csrf")
    public RespuestaCsrf obtenerCsrf(CsrfToken token) {
        return new RespuestaCsrf(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    @PostMapping("/registro")
    public ResponseEntity<RespuestaMensaje> registrar(@Valid @RequestBody SolicitudRegistroCuenta solicitud) {
        boolean correoEnviado;
        try {
            correoEnviado = servicioRegistroCuenta.registrar(solicitud);
        }
        catch (DataIntegrityViolationException ignorada) {
            throw new ConflictoDatosException("El correo electrónico o DPI/CUI ya está registrado.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(new RespuestaMensaje(
                correoEnviado ? MENSAJE_REGISTRO : MENSAJE_REGISTRO_SIN_CORREO));
    }

    @PostMapping("/confirmar-correo")
    public RespuestaMensaje confirmarCorreo(@Valid @RequestBody SolicitudConfirmacionCorreo solicitud) {
        servicioVerificacionCorreo.confirmar(solicitud.token());
        return new RespuestaMensaje("Confirmado, ya puedes iniciar sesión.");
    }

    @PostMapping("/reenviar-verificacion")
    public RespuestaMensaje reenviarVerificacion(@Valid @RequestBody SolicitudReenvioVerificacion solicitud) {
        servicioVerificacionCorreo.reenviar(solicitud.correo());
        return new RespuestaMensaje(MENSAJE_REENVIO);
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
        return servicioPerfilUsuario.obtener(usuarioSesion);
    }

    @PutMapping("/perfil")
    public RespuestaPerfil actualizarPerfil(
            @AuthenticationPrincipal UsuarioSesion usuarioSesion,
            @Valid @RequestBody SolicitudActualizacionPerfil solicitud) {
        return servicioPerfilUsuario.actualizar(usuarioSesion, solicitud);
    }

    @PostMapping(value = "/perfil/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RespuestaPerfil guardarFotoPerfil(
            @AuthenticationPrincipal UsuarioSesion usuarioSesion,
            @RequestPart("archivo") MultipartFile archivo) {
        return servicioPerfilUsuario.guardarFoto(usuarioSesion, archivo);
    }

    @DeleteMapping("/perfil/foto")
    public RespuestaPerfil eliminarFotoPerfil(@AuthenticationPrincipal UsuarioSesion usuarioSesion) {
        return servicioPerfilUsuario.eliminarFoto(usuarioSesion);
    }

    @GetMapping("/perfil/foto")
    public ResponseEntity<Resource> cargarFotoPerfil(@AuthenticationPrincipal UsuarioSesion usuarioSesion) {
        var foto = servicioPerfilUsuario.cargarFoto(usuarioSesion);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(foto.tipoMedio()))
                .contentLength(foto.tamanoBytes())
                .cacheControl(CacheControl.noCache().cachePrivate())
                .body(foto.recurso());
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
