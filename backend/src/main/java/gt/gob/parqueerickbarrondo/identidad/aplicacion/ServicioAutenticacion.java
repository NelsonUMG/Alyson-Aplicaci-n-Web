package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.time.Instant;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPerfil;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudCambioContrasena;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudInicioSesion;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ServicioAutenticacion {

    private final AuthenticationManager administradorAutenticacion;
    private final SecurityContextRepository repositorioContextoSeguridad;
    private final SessionRegistry registroSesiones;
    private final RepositorioUsuario repositorioUsuario;
    private final NormalizadorCorreo normalizadorCorreo;
    private final ProtectorIntentosInicioSesion protectorIntentos;
    private final PasswordEncoder codificadorContrasena;
    private final PoliticaContrasena politicaContrasena;
    private final ServicioAuditoria servicioAuditoria;
    private final TransactionTemplate plantillaTransacciones;

    public ServicioAutenticacion(
            AuthenticationManager administradorAutenticacion,
            SecurityContextRepository repositorioContextoSeguridad,
            SessionRegistry registroSesiones,
            RepositorioUsuario repositorioUsuario,
            NormalizadorCorreo normalizadorCorreo,
            ProtectorIntentosInicioSesion protectorIntentos,
            PasswordEncoder codificadorContrasena,
            PoliticaContrasena politicaContrasena,
            ServicioAuditoria servicioAuditoria,
            TransactionTemplate plantillaTransacciones) {
        this.administradorAutenticacion = administradorAutenticacion;
        this.repositorioContextoSeguridad = repositorioContextoSeguridad;
        this.registroSesiones = registroSesiones;
        this.repositorioUsuario = repositorioUsuario;
        this.normalizadorCorreo = normalizadorCorreo;
        this.protectorIntentos = protectorIntentos;
        this.codificadorContrasena = codificadorContrasena;
        this.politicaContrasena = politicaContrasena;
        this.servicioAuditoria = servicioAuditoria;
        this.plantillaTransacciones = plantillaTransacciones;
    }

    public RespuestaPerfil iniciarSesion(
            SolicitudInicioSesion solicitud,
            HttpServletRequest peticion,
            HttpServletResponse respuesta) {
        var correo = normalizadorCorreo.normalizar(solicitud.correo());
        var idCorrelacion = IdentificadorCorrelacion.actual();
        var huellas = protectorIntentos.crearHuellas(
                correo,
                peticion.getRemoteAddr(),
                peticion.getHeader("User-Agent"));
        protectorIntentos.verificarPermitido(huellas, idCorrelacion);

        try {
            var autenticacion = administradorAutenticacion.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(correo, solicitud.contrasena()));
            var usuarioSesion = (UsuarioSesion) autenticacion.getPrincipal();

            plantillaTransacciones.executeWithoutResult(estado -> {
                var usuario = repositorioUsuario.findById(usuarioSesion.obtenerIdUsuario())
                        .orElseThrow(CredencialesInvalidasException::new);
                usuario.registrarAcceso(Instant.now());
                protectorIntentos.registrar(usuarioSesion.obtenerIdUsuario(), huellas, "EXITOSO", null, idCorrelacion);
                servicioAuditoria.registrar(
                        usuarioSesion.obtenerIdUsuario(),
                        "INICIOSESION",
                        "SESION",
                        null,
                        "EXITOSO",
                        idCorrelacion);
            });

            rotarSesion(peticion);
            var contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(autenticacion);
            SecurityContextHolder.setContext(contexto);
            repositorioContextoSeguridad.saveContext(contexto, peticion, respuesta);
            registroSesiones.registerNewSession(peticion.getSession().getId(), usuarioSesion);
            return convertirPerfil(usuarioSesion);
        }
        catch (AuthenticationException excepcion) {
            plantillaTransacciones.executeWithoutResult(estado -> {
                protectorIntentos.registrar(null, huellas, "FALLIDO", "CREDENCIALESINVALIDAS", idCorrelacion);
                servicioAuditoria.registrar(null, "INICIOSESION", "SESION", null, "FALLIDO", idCorrelacion);
            });
            throw new CredencialesInvalidasException();
        }
    }

    public RespuestaPerfil obtenerPerfil(UsuarioSesion usuarioSesion) {
        return convertirPerfil(usuarioSesion);
    }

    public void cambiarContrasena(
            UsuarioSesion usuarioSesion,
            SolicitudCambioContrasena solicitud,
            HttpSession sesionActual) {
        politicaContrasena.validar(solicitud.contrasenaNueva());
        plantillaTransacciones.executeWithoutResult(estado -> {
            var usuario = repositorioUsuario.buscarConPermisosPorId(usuarioSesion.obtenerIdUsuario())
                    .orElseThrow(CredencialesInvalidasException::new);
            if (!codificadorContrasena.matches(solicitud.contrasenaActual(), usuario.obtenerHashContrasena())) {
                throw new CredencialesInvalidasException();
            }
            if (codificadorContrasena.matches(solicitud.contrasenaNueva(), usuario.obtenerHashContrasena())) {
                throw new SolicitudInvalidaException("La contraseña nueva debe ser diferente de la actual.");
            }

            usuario.cambiarContrasena(codificadorContrasena.encode(solicitud.contrasenaNueva()));
            servicioAuditoria.registrar(
                    usuarioSesion.obtenerIdUsuario(),
                    "CONTRASENAACTUALIZADA",
                    "USUARIO",
                    usuarioSesion.obtenerIdUsuario().toString(),
                    "EXITOSO",
                    null);
        });
        invalidarOtrasSesiones(usuarioSesion, sesionActual.getId());
    }

    private void rotarSesion(HttpServletRequest peticion) {
        var sesionAnterior = peticion.getSession(false);
        if (sesionAnterior != null) {
            sesionAnterior.invalidate();
        }
        peticion.getSession(true);
    }

    private void invalidarOtrasSesiones(UsuarioSesion usuarioSesion, String idSesionActual) {
        registroSesiones.getAllSessions(usuarioSesion, false).stream()
                .filter(informacion -> !informacion.getSessionId().equals(idSesionActual))
                .forEach(informacion -> informacion.expireNow());
    }

    private RespuestaPerfil convertirPerfil(UsuarioSesion usuarioSesion) {
        return new RespuestaPerfil(
                usuarioSesion.obtenerIdUsuario(),
                usuarioSesion.obtenerCorreo(),
                usuarioSesion.obtenerNombre(),
                usuarioSesion.obtenerApellido(),
                usuarioSesion.obtenerRoles(),
                usuarioSesion.obtenerPermisos());
    }
}
