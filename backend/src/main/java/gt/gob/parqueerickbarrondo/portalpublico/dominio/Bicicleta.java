package gt.gob.parqueerickbarrondo.portalpublico.dominio;

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
@Table(name = "Bicicletas", schema = "dbo")
public class Bicicleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdBicicleta")
    private Long idBicicleta;

    @Column(name = "Codigo", nullable = false, length = 64)
    private String codigo;

    @Column(name = "Estado", nullable = false, length = 32)
    private String estado;

    @Column(name = "ObservacionesInventario", length = 500)
    private String observacionesInventario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CreadoPor", nullable = false)
    private Usuario creadoPor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ActualizadoPor", nullable = false)
    private Usuario actualizadoPor;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected Bicicleta() {
    }

    public Bicicleta(
            String codigo,
            String estado,
            String observacionesInventario,
            Usuario responsable) {
        var ahora = Instant.now();
        this.codigo = codigo;
        this.estado = estado;
        this.observacionesInventario = observacionesInventario;
        this.creadoPor = responsable;
        this.actualizadoPor = responsable;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdBicicleta() {
        return idBicicleta;
    }

    public String obtenerCodigo() {
        return codigo;
    }

    public String obtenerEstado() {
        return estado;
    }

    public String obtenerObservacionesInventario() {
        return observacionesInventario;
    }

    public Usuario obtenerActualizadoPor() {
        return actualizadoPor;
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

    public void actualizarInventario(
            String codigo,
            String observacionesInventario,
            Usuario responsable) {
        this.codigo = codigo;
        this.observacionesInventario = observacionesInventario;
        this.actualizadoPor = responsable;
        this.actualizadoEn = Instant.now();
    }

    public void cambiarEstado(String nuevoEstado, Usuario responsable) {
        this.estado = nuevoEstado;
        this.actualizadoPor = responsable;
        this.actualizadoEn = Instant.now();
    }
}
