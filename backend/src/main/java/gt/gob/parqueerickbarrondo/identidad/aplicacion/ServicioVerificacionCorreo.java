package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.dominio.TokenVerificacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioTokenVerificacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioVerificacionCorreo {

    private static final SecureRandom ALEATORIO_SEGURO = new SecureRandom();
    private final RepositorioTokenVerificacionCorreo repositorioToken;
    private final RepositorioUsuario repositorioUsuario;
    private final NormalizadorCorreo normalizadorCorreo;
    private final EnviadorCorreoVerificacion enviadorCorreo;
    private final ServicioAuditoria servicioAuditoria;
    private final Duration duracionToken;
    private final Duration esperaReenvio;

    public ServicioVerificacionCorreo(
            RepositorioTokenVerificacionCorreo repositorioToken,
            RepositorioUsuario repositorioUsuario,
            NormalizadorCorreo normalizadorCorreo,
            EnviadorCorreoVerificacion enviadorCorreo,
            ServicioAuditoria servicioAuditoria,
            @Value("${correo.verificacion.duracion-horas:24}") long duracionHoras,
            @Value("${correo.verificacion.reenvio-espera-minutos:5}") long esperaReenvioMinutos) {
        this.repositorioToken = repositorioToken;
        this.repositorioUsuario = repositorioUsuario;
        this.normalizadorCorreo = normalizadorCorreo;
        this.enviadorCorreo = enviadorCorreo;
        this.servicioAuditoria = servicioAuditoria;
        this.duracionToken = Duration.ofHours(duracionHoras);
        this.esperaReenvio = Duration.ofMinutes(esperaReenvioMinutos);
        if (duracionHoras <= 0 || esperaReenvioMinutos < 0) {
            throw new IllegalArgumentException("La duración del token y la espera de reenvío deben ser válidas.");
        }
    }

    @Transactional
    public void crearYEnviar(Usuario usuario) {
        var token = generarToken();
        var ahora = Instant.now();
        repositorioToken.saveAndFlush(new TokenVerificacionCorreo(
                usuario,
                resumir(token),
                ahora.plus(duracionToken),
                ahora));
        enviadorCorreo.enviar(usuario.obtenerCorreoNormalizado(), usuario.obtenerNombre(), token);
    }

    @Transactional
    public void confirmar(String tokenSinNormalizar) {
        var token = tokenSinNormalizar == null ? "" : tokenSinNormalizar.strip();
        var registro = repositorioToken.findByHashToken(resumir(token))
                .orElseThrow(() -> new SolicitudInvalidaException(
                        "El enlace de verificación no es válido o ya venció."));
        var usuario = registro.obtenerUsuario();
        if (usuario.estaActivo() && usuario.obtenerCorreoVerificadoEn() != null) {
            return;
        }
        var ahora = Instant.now();
        if (registro.obtenerConsumidoEn() != null || registro.estaExpirado(ahora)
                || !usuario.estaPendienteDeVerificacion()) {
            throw new SolicitudInvalidaException("El enlace de verificación no es válido o ya venció.");
        }

        invalidarTokensAnteriores(usuario.obtenerIdUsuario());
        usuario.confirmarCorreo(ahora);
        servicioAuditoria.registrar(
                usuario.obtenerIdUsuario(),
                "CORREOVERIFICADO",
                "USUARIO",
                usuario.obtenerIdUsuario().toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }

    @Transactional
    public void reenviar(String correo) {
        repositorioUsuario.buscarPorCorreoParaVerificacion(normalizadorCorreo.normalizar(correo))
                .filter(Usuario::estaPendienteDeVerificacion)
                .filter(this::puedeReenviar)
                .ifPresent(this::crearYEnviar);
    }

    private boolean puedeReenviar(Usuario usuario) {
        var limite = Instant.now().minus(esperaReenvio);
        return repositorioToken.findFirstByUsuario_IdUsuarioOrderByCreadoEnDesc(usuario.obtenerIdUsuario())
                .map(token -> !token.obtenerCreadoEn().isAfter(limite))
                .orElse(true);
    }

    private void invalidarTokensAnteriores(Long idUsuario) {
        var ahora = Instant.now();
        repositorioToken.findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(idUsuario)
                .forEach(token -> token.consumir(ahora));
    }

    private String generarToken() {
        var bytes = new byte[32];
        ALEATORIO_SEGURO.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private byte[] resumir(String token) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
        }
        catch (NoSuchAlgorithmException excepcion) {
            throw new IllegalStateException("SHA-256 no está disponible.", excepcion);
        }
    }
}
