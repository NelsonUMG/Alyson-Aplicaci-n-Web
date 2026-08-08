package gt.gob.parqueerickbarrondo.compartido.idempotencia;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioIdempotencia {

    private static final int LONGITUD_MINIMA_CLAVE = 8;
    private static final int LONGITUD_MAXIMA_CLAVE = 128;

    private final RepositorioRegistroIdempotencia repositorioRegistro;
    private final ObjectMapper serializadorJson;

    public ServicioIdempotencia(
            RepositorioRegistroIdempotencia repositorioRegistro,
            ObjectMapper serializadorJson) {
        this.repositorioRegistro = repositorioRegistro;
        this.serializadorJson = serializadorJson;
    }

    public <T> ContextoIdempotencia<T> preparar(
            String clave,
            Long idUsuario,
            String codigoOperacion,
            Object solicitud,
            Class<T> tipoRespuesta) {
        if (clave == null || clave.isBlank()) {
            return ContextoIdempotencia.sinClave();
        }
        var claveNormalizada = clave.strip();
        if (claveNormalizada.length() < LONGITUD_MINIMA_CLAVE
                || claveNormalizada.length() > LONGITUD_MAXIMA_CLAVE) {
            throw new SolicitudInvalidaException(
                    "La clave de idempotencia debe tener entre 8 y 128 caracteres.");
        }
        var alcance = "USUARIO:" + idUsuario;
        var hashClave = resumir(claveNormalizada.getBytes(StandardCharsets.UTF_8));
        var hashSolicitud = resumir(serializar(solicitud).getBytes(StandardCharsets.UTF_8));
        var ahora = Instant.now();
        var existente = repositorioRegistro
                .findByAlcanceActorAndCodigoOperacionAndHashClaveIdempotencia(
                        alcance, codigoOperacion, hashClave)
                .orElse(null);
        if (existente != null && existente.estaExpirado(ahora)) {
            repositorioRegistro.delete(existente);
            repositorioRegistro.flush();
            existente = null;
        }
        if (existente != null) {
            existente.validarReutilizacion(hashSolicitud);
            return ContextoIdempotencia.repetido(deserializar(existente.obtenerRespuestaJson(), tipoRespuesta));
        }
        var registro = new RegistroIdempotencia(
                idUsuario,
                alcance,
                codigoOperacion,
                hashClave,
                hashSolicitud,
                ahora.plus(Duration.ofHours(24)));
        repositorioRegistro.saveAndFlush(registro);
        return ContextoIdempotencia.nuevo(registro);
    }

    public void completar(ContextoIdempotencia<?> contexto, int estadoHttp, Object respuesta) {
        if (contexto.registro() == null) {
            return;
        }
        contexto.registro().completar((short) estadoHttp, serializar(respuesta));
        repositorioRegistro.save(contexto.registro());
    }

    private String serializar(Object valor) {
        try {
            return serializadorJson.writeValueAsString(valor);
        } catch (JacksonException excepcion) {
            throw new IllegalStateException("No fue posible serializar la operación idempotente.", excepcion);
        }
    }

    private <T> T deserializar(String contenido, Class<T> tipo) {
        try {
            return serializadorJson.readValue(contenido, tipo);
        } catch (JacksonException excepcion) {
            throw new IllegalStateException("No fue posible recuperar la operación idempotente.", excepcion);
        }
    }

    private byte[] resumir(byte[] contenido) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(contenido);
        } catch (NoSuchAlgorithmException excepcion) {
            throw new IllegalStateException("SHA-256 no está disponible.", excepcion);
        }
    }

    public record ContextoIdempotencia<T>(RegistroIdempotencia registro, T respuestaRepetida) {

        public static <T> ContextoIdempotencia<T> sinClave() {
            return new ContextoIdempotencia<>(null, null);
        }

        public static <T> ContextoIdempotencia<T> nuevo(RegistroIdempotencia registro) {
            return new ContextoIdempotencia<>(registro, null);
        }

        public static <T> ContextoIdempotencia<T> repetido(T respuesta) {
            return new ContextoIdempotencia<>(null, respuesta);
        }

        public boolean tieneRespuestaRepetida() {
            return respuestaRepetida != null;
        }
    }
}
