package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.time.Duration;
import java.time.Instant;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRestablecerContrasena;
import gt.gob.parqueerickbarrondo.identidad.dominio.TokenRestablecimientoContrasena;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.*;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ServicioRecuperacionContrasena {
    private static final Logger LOG = LoggerFactory.getLogger(ServicioRecuperacionContrasena.class);
    private static final Duration VIGENCIA = Duration.ofHours(1);
    private static final Duration ESPERA = Duration.ofMinutes(5);
    private final RepositorioUsuario usuarios;
    private final RepositorioTokenRestablecimientoContrasena tokens;
    private final NormalizadorCorreo normalizador;
    private final PasswordEncoder codificador;
    private final PoliticaContrasena politica;
    private final EnviadorCorreoRecuperacion correo;
    private final ServicioAuditoria auditoria;
    private final SessionRegistry sesiones;

    public ServicioRecuperacionContrasena(RepositorioUsuario usuarios, RepositorioTokenRestablecimientoContrasena tokens,
            NormalizadorCorreo normalizador, PasswordEncoder codificador, PoliticaContrasena politica,
            EnviadorCorreoRecuperacion correo, ServicioAuditoria auditoria, SessionRegistry sesiones) {
        this.usuarios = usuarios; this.tokens = tokens; this.normalizador = normalizador;
        this.codificador = codificador; this.politica = politica; this.correo = correo;
        this.auditoria = auditoria; this.sesiones = sesiones;
    }

    @Async("recuperacionExecutor")
    @Transactional
    public void solicitar(String direccion) {
        var usuario = usuarios.buscarPorCorreoParaVerificacion(normalizador.normalizar(direccion))
                .filter(u -> u.estaActivo() && u.obtenerCorreoVerificadoEn() != null).orElse(null);
        if (usuario == null) return;
        var ahora = Instant.now();
        if (tokens.findFirstByUsuario_IdUsuarioOrderByCreadoEnDesc(usuario.obtenerIdUsuario())
                .filter(t -> t.obtenerCreadoEn().isAfter(ahora.minus(ESPERA))).isPresent()) return;
        var token = TokensSeguros.generar();
        var registro = new TokenRestablecimientoContrasena(usuario, TokensSeguros.resumir(token), ahora.plus(VIGENCIA), ahora);
        var anteriores = tokens.findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(usuario.obtenerIdUsuario());
        tokens.saveAndFlush(registro);
        try {
            correo.enviar(usuario.obtenerCorreoNormalizado(), usuario.obtenerNombre(), token);
            anteriores.forEach(t -> t.consumir(ahora));
        } catch (RuntimeException error) {
            registro.consumir(ahora);
            LOG.warn("Falló el envío de recuperación para usuario {}.", usuario.obtenerIdUsuario());
        }
    }

    @Transactional
    public void restablecer(SolicitudRestablecerContrasena solicitud) {
        politica.validar(solicitud.contrasenaNueva());
        if (!solicitud.contrasenaNueva().equals(solicitud.confirmarContrasena()))
            throw new SolicitudInvalidaException("Las contraseñas no coinciden.");
        var hash = TokensSeguros.resumir(solicitud.token().strip());
        var direccion = tokens.buscarCorreoPorHash(hash).orElseThrow(this::enlaceInvalido);
        // Mismo orden de bloqueo que en el envío: primero usuario, luego sus tokens.
        var usuario = usuarios.buscarPorCorreoParaVerificacion(direccion)
                .orElseThrow(this::enlaceInvalido);
        var registro = tokens.buscarParaConsumir(hash).orElseThrow(this::enlaceInvalido);
        var ahora = Instant.now();
        if (registro.obtenerConsumidoEn() != null || registro.estaExpirado(ahora)
                || !usuario.estaActivo() || usuario.obtenerCorreoVerificadoEn() == null
                || !registro.correspondeContrasenaActual()) throw enlaceInvalido();
        if (codificador.matches(solicitud.contrasenaNueva(), usuario.obtenerHashContrasena()))
            throw new SolicitudInvalidaException("La contraseña nueva debe ser diferente de la actual.");
        usuario.cambiarContrasena(codificador.encode(solicitud.contrasenaNueva()));
        tokens.findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(usuario.obtenerIdUsuario()).forEach(t -> t.consumir(ahora));
        registro.consumir(ahora);
        auditoria.registrar(usuario.obtenerIdUsuario(), "CONTRASENAACTUALIZADA", "USUARIO",
                usuario.obtenerIdUsuario().toString(), "EXITOSO", null);
        var idUsuario = usuario.obtenerIdUsuario();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { invalidarSesiones(idUsuario); }
            });
        } else invalidarSesiones(idUsuario);
    }

    private void invalidarSesiones(Long idUsuario) {
        sesiones.getAllPrincipals().stream()
                .filter(p -> p instanceof UsuarioSesion u && idUsuario.equals(u.obtenerIdUsuario()))
                .forEach(p -> sesiones.getAllSessions(p, false).forEach(s -> s.expireNow()));
    }
    private SolicitudInvalidaException enlaceInvalido() {
        return new SolicitudInvalidaException("El enlace de recuperación no es válido, ya fue utilizado o venció. Solicita uno nuevo.");
    }
}
