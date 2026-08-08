package gt.gob.parqueerickbarrondo.areas.dominio;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
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
@Table(name = "ReservasArea", schema = "dbo")
public class ReservaArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdReservaArea")
    private Long idReservaArea;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdArea", nullable = false)
    private Area area;

    @Column(name = "Titulo", nullable = false, length = 150)
    private String titulo;

    @Column(name = "IniciaEn", nullable = false)
    private Instant iniciaEn;

    @Column(name = "FinalizaEn", nullable = false)
    private Instant finalizaEn;

    @Column(name = "Estado", nullable = false, length = 32)
    private String estado;

    @Column(name = "Observaciones", length = 300)
    private String observaciones;

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

    protected ReservaArea() {
    }

    public ReservaArea(
            Area area,
            String titulo,
            Instant iniciaEn,
            Instant finalizaEn,
            String estado,
            String observaciones,
            Usuario responsable) {
        var ahora = Instant.now();
        this.area = area;
        this.titulo = titulo;
        this.iniciaEn = iniciaEn;
        this.finalizaEn = finalizaEn;
        this.estado = estado;
        this.observaciones = observaciones;
        this.creadoPor = responsable;
        this.actualizadoPor = responsable;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdReservaArea() {
        return idReservaArea;
    }

    public Area obtenerArea() {
        return area;
    }

    public String obtenerTitulo() {
        return titulo;
    }

    public Instant obtenerIniciaEn() {
        return iniciaEn;
    }

    public Instant obtenerFinalizaEn() {
        return finalizaEn;
    }

    public String obtenerEstado() {
        return estado;
    }

    public String obtenerObservaciones() {
        return observaciones;
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

    public void actualizar(
            String titulo,
            Instant iniciaEn,
            Instant finalizaEn,
            String estado,
            String observaciones,
            Usuario responsable) {
        this.titulo = titulo;
        this.iniciaEn = iniciaEn;
        this.finalizaEn = finalizaEn;
        this.estado = estado;
        this.observaciones = observaciones;
        this.actualizadoPor = responsable;
        this.actualizadoEn = Instant.now();
    }
}
