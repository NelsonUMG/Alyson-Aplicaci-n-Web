package gt.gob.parqueerickbarrondo.eventos.dominio;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
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
@Table(name = "InscripcionesEvento", schema = "dbo")
public class InscripcionEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdInscripcionEvento")
    private Long idInscripcionEvento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdEvento", nullable = false)
    private Evento evento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuario", nullable = false)
    private Usuario usuario;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "RequisitosAceptadosEn", nullable = false)
    private Instant requisitosAceptadosEn;

    @Column(name = "ConfirmadaEn")
    private Instant confirmadaEn;

    @Column(name = "CanceladaEn")
    private Instant canceladaEn;

    @Column(name = "MotivoCancelacion", length = 300)
    private String motivoCancelacion;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected InscripcionEvento() {
    }

    public InscripcionEvento(Evento evento, Usuario usuario, Instant ahora) {
        this.evento = evento;
        this.usuario = usuario;
        this.estado = "CONFIRMADA";
        this.requisitosAceptadosEn = ahora;
        this.confirmadaEn = ahora;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdInscripcionEvento() {
        return idInscripcionEvento;
    }

    public Evento obtenerEvento() {
        return evento;
    }

    public Usuario obtenerUsuario() {
        return usuario;
    }

    public String obtenerEstado() {
        return estado;
    }

    public Instant obtenerRequisitosAceptadosEn() {
        return requisitosAceptadosEn;
    }

    public Instant obtenerConfirmadaEn() {
        return confirmadaEn;
    }

    public Instant obtenerCanceladaEn() {
        return canceladaEn;
    }

    public String obtenerMotivoCancelacion() {
        return motivoCancelacion;
    }

    public Instant obtenerCreadoEn() {
        return creadoEn;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public boolean estaConfirmada() {
        return "CONFIRMADA".equals(estado);
    }

    public void confirmarNuevamente(Instant ahora) {
        estado = "CONFIRMADA";
        requisitosAceptadosEn = ahora;
        confirmadaEn = ahora;
        canceladaEn = null;
        motivoCancelacion = null;
        actualizadoEn = ahora;
    }

    public void cancelar(String motivo, Instant ahora) {
        estado = "CANCELADA";
        canceladaEn = ahora;
        motivoCancelacion = motivo;
        actualizadoEn = ahora;
    }
}
