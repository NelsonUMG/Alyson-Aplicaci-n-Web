package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import gt.gob.parqueerickbarrondo.identidad.dominio.IntentoInicioSesion;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioIntentoInicioSesion;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ProtectorIntentosInicioSesion {

    private static final String ALGORITMO = "HmacSHA256";

    private final RepositorioIntentoInicioSesion repositorioIntento;
    private final byte[] claveHuellas;
    private final int maximoIntentos;
    private final int ventanaMinutos;

    public ProtectorIntentosInicioSesion(
            RepositorioIntentoInicioSesion repositorioIntento,
            @Value("${seguridad.intentos.clave-huellas}") String claveHuellas,
            @Value("${seguridad.intentos.maximos}") int maximoIntentos,
            @Value("${seguridad.intentos.ventana-minutos}") int ventanaMinutos) {
        if (claveHuellas == null
                || claveHuellas.getBytes(StandardCharsets.UTF_8).length < 32
                || claveHuellas.trim().toUpperCase(Locale.ROOT).startsWith("REEMPLAZAR")) {
            throw new IllegalStateException(
                    "SEGURIDADCLAVEHUELLAS debe ser una clave aleatoria propia de al menos 32 bytes.");
        }
        if (maximoIntentos < 1 || ventanaMinutos < 1) {
            throw new IllegalStateException("La protección de acceso requiere límites positivos.");
        }
        this.repositorioIntento = repositorioIntento;
        this.claveHuellas = claveHuellas.getBytes(StandardCharsets.UTF_8).clone();
        this.maximoIntentos = maximoIntentos;
        this.ventanaMinutos = ventanaMinutos;
    }

    public HuellasIntento crearHuellas(String correoNormalizado, String direccionIp, String agenteUsuario) {
        return new HuellasIntento(
                resumir("correo:" + correoNormalizado),
                resumir("ip:" + valorSeguro(direccionIp)),
                agenteUsuario == null || agenteUsuario.isBlank()
                        ? null
                        : resumir("agente:" + agenteUsuario));
    }

    public void verificarPermitido(HuellasIntento huellas, String idCorrelacion) {
        var desde = Instant.now().minusSeconds(ventanaMinutos * 60L);
        var fallos = repositorioIntento.contarFallosRecientes(
                huellas.huellaCorreo(), huellas.huellaIp(), desde);
        if (fallos >= maximoIntentos) {
            registrar(null, huellas, "LIMITADO", "LIMITEALCANZADO", idCorrelacion);
            throw new DemasiadosIntentosException();
        }
    }

    public void registrar(
            Long idUsuario,
            HuellasIntento huellas,
            String resultado,
            String motivoFallo,
            String idCorrelacion) {
        repositorioIntento.save(new IntentoInicioSesion(
                idUsuario,
                huellas.huellaCorreo(),
                huellas.huellaIp(),
                huellas.huellaAgenteUsuario(),
                resultado,
                motivoFallo,
                idCorrelacion));
    }

    private byte[] resumir(String valor) {
        try {
            var mac = Mac.getInstance(ALGORITMO);
            mac.init(new SecretKeySpec(claveHuellas, ALGORITMO));
            return mac.doFinal(valor.getBytes(StandardCharsets.UTF_8));
        }
        catch (GeneralSecurityException excepcion) {
            throw new IllegalStateException("No fue posible generar una huella segura.", excepcion);
        }
    }

    private String valorSeguro(String valor) {
        return valor == null || valor.isBlank() ? "desconocida" : valor;
    }

    public record HuellasIntento(byte[] huellaCorreo, byte[] huellaIp, byte[] huellaAgenteUsuario) {

        public HuellasIntento {
            huellaCorreo = huellaCorreo.clone();
            huellaIp = huellaIp.clone();
            huellaAgenteUsuario = huellaAgenteUsuario == null ? null : huellaAgenteUsuario.clone();
        }

        @Override
        public byte[] huellaCorreo() {
            return huellaCorreo.clone();
        }

        @Override
        public byte[] huellaIp() {
            return huellaIp.clone();
        }

        @Override
        public byte[] huellaAgenteUsuario() {
            return huellaAgenteUsuario == null ? null : huellaAgenteUsuario.clone();
        }
    }
}
