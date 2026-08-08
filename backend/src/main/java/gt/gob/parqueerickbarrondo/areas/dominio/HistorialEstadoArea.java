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

@Entity
@Table(name = "HistorialEstadosArea", schema = "dbo")
public class HistorialEstadoArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdHistorialEstadoArea")
    private Long idHistorialEstadoArea;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdArea", nullable = false)
    private Area area;

    @Column(name = "EstadoAnterior", length = 40)
    private String estadoAnterior;

    @Column(name = "EstadoNuevo", nullable = false, length = 40)
    private String estadoNuevo;

    @Column(name = "Motivo", nullable = false, length = 500)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CambiadoPor", nullable = false)
    private Usuario cambiadoPor;

    @Column(name = "CambiadoEn", nullable = false)
    private Instant cambiadoEn;

    protected HistorialEstadoArea() {
    }

    public HistorialEstadoArea(
            Area area,
            String estadoAnterior,
            String estadoNuevo,
            String motivo,
            Usuario cambiadoPor) {
        this.area = area;
        this.estadoAnterior = estadoAnterior;
        this.estadoNuevo = estadoNuevo;
        this.motivo = motivo;
        this.cambiadoPor = cambiadoPor;
        this.cambiadoEn = Instant.now();
    }

    public Long obtenerIdHistorialEstadoArea() {
        return idHistorialEstadoArea;
    }

    public String obtenerEstadoAnterior() {
        return estadoAnterior;
    }

    public String obtenerEstadoNuevo() {
        return estadoNuevo;
    }

    public String obtenerMotivo() {
        return motivo;
    }

    public Usuario obtenerCambiadoPor() {
        return cambiadoPor;
    }

    public Instant obtenerCambiadoEn() {
        return cambiadoEn;
    }
}
