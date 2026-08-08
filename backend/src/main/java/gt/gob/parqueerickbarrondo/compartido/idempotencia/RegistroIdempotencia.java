package gt.gob.parqueerickbarrondo.compartido.idempotencia;

import java.time.Instant;
import java.util.Arrays;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "RegistrosIdempotencia", schema = "dbo")
public class RegistroIdempotencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdRegistroIdempotencia")
    private Long idRegistroIdempotencia;

    @Column(name = "IdUsuarioActor")
    private Long idUsuarioActor;

    @Column(name = "AlcanceActor", nullable = false, length = 128)
    private String alcanceActor;

    @Column(name = "CodigoOperacion", nullable = false, length = 80)
    private String codigoOperacion;

    @Column(name = "HashClaveIdempotencia", nullable = false, length = 32)
    private byte[] hashClaveIdempotencia;

    @Column(name = "HashSolicitud", nullable = false, length = 32)
    private byte[] hashSolicitud;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "EstadoRespuesta")
    private Short estadoRespuesta;

    @Column(name = "RespuestaJson")
    private String respuestaJson;

    @Column(name = "ExpiraEn", nullable = false)
    private Instant expiraEn;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    protected RegistroIdempotencia() {
    }

    public RegistroIdempotencia(
            Long idUsuarioActor,
            String alcanceActor,
            String codigoOperacion,
            byte[] hashClaveIdempotencia,
            byte[] hashSolicitud,
            Instant expiraEn) {
        var ahora = Instant.now();
        this.idUsuarioActor = idUsuarioActor;
        this.alcanceActor = alcanceActor;
        this.codigoOperacion = codigoOperacion;
        this.hashClaveIdempotencia = hashClaveIdempotencia.clone();
        this.hashSolicitud = hashSolicitud.clone();
        this.estado = "PROCESANDO";
        this.expiraEn = expiraEn;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public boolean correspondeASolicitud(byte[] hash) {
        return Arrays.equals(hashSolicitud, hash);
    }

    public boolean estaCompletado() {
        return "COMPLETADO".equals(estado);
    }

    public boolean estaExpirado(Instant ahora) {
        return !expiraEn.isAfter(ahora);
    }

    public String obtenerRespuestaJson() {
        return respuestaJson;
    }

    public void completar(short estadoHttp, String respuestaJson) {
        this.estado = "COMPLETADO";
        this.estadoRespuesta = estadoHttp;
        this.respuestaJson = respuestaJson;
        this.actualizadoEn = Instant.now();
    }

    public void validarReutilizacion(byte[] hash) {
        if (!correspondeASolicitud(hash)) {
            throw new ConflictoDatosException(
                    "La clave de idempotencia ya fue utilizada con otros datos.");
        }
        if (!estaCompletado()) {
            throw new ConflictoDatosException("La operación con esa clave todavía está en proceso.");
        }
    }
}
