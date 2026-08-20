package gt.gob.parqueerickbarrondo.solicitudes.dominio;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "Solicitudes", schema = "dbo")
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdSolicitud")
    private Long idSolicitud;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuarioSolicitante", nullable = false)
    private Usuario usuarioSolicitante;

    @Column(name = "TipoSolicitud", nullable = false, length = 64)
    private String tipoSolicitud;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "Detalle", nullable = false)
    private String detalle;

    @Column(name = "Resolucion")
    private String resolucion;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Column(name = "ResueltoEn")
    private Instant resueltoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected Solicitud() {
    }

    public Solicitud(Usuario usuarioSolicitante, String tipoSolicitud, String detalle) {
        var ahora = Instant.now();
        this.usuarioSolicitante = usuarioSolicitante;
        this.tipoSolicitud = tipoSolicitud;
        this.estado = "BORRADOR";
        this.detalle = detalle;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdSolicitud() {
        return idSolicitud;
    }

    public String obtenerTipoSolicitud() {
        return tipoSolicitud;
    }

    public Usuario obtenerUsuarioSolicitante() {
        return usuarioSolicitante;
    }

    public String obtenerEstado() {
        return estado;
    }

    public String obtenerResolucion() {
        return resolucion;
    }

    public String obtenerDetalle() {
        return detalle;
    }

    public Instant obtenerCreadoEn() {
        return creadoEn;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Instant obtenerResueltoEn() {
        return resueltoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizarBorrador(String detalle) {
        if (!"BORRADOR".equals(estado)) {
            throw new IllegalStateException("Solo se puede modificar una solicitud en borrador.");
        }
        this.detalle = detalle;
        this.actualizadoEn = Instant.now();
    }

    public void enviar() {
        if (!"BORRADOR".equals(estado)) {
            throw new IllegalStateException("Solo se puede enviar una solicitud en borrador.");
        }
        estado = "ENVIADA";
        actualizadoEn = Instant.now();
    }

    public void iniciarRevision() {
        if (!"ENVIADA".equals(estado) && !"ENREVISION".equals(estado)) {
            throw new IllegalStateException("La solicitud no está disponible para revisión.");
        }
        estado = "ENREVISION";
        actualizadoEn = Instant.now();
    }

    public void resolver(boolean aprobada, String respuesta) {
        if (!"ENVIADA".equals(estado) && !"ENREVISION".equals(estado)) {
            throw new IllegalStateException("La solicitud ya no está disponible para resolución.");
        }
        var ahora = Instant.now();
        estado = aprobada ? "APROBADA" : "RECHAZADA";
        resolucion = respuesta;
        resueltoEn = ahora;
        actualizadoEn = ahora;
    }
}
