package gt.gob.parqueerickbarrondo.bicicletas.dominio;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Bicicleta;
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
@Table(name = "HistorialEstadosBicicleta", schema = "dbo")
public class HistorialEstadoBicicleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdHistorialEstadoBicicleta")
    private Long idHistorialEstadoBicicleta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdBicicleta", nullable = false)
    private Bicicleta bicicleta;

    @Column(name = "EstadoAnterior", length = 32)
    private String estadoAnterior;

    @Column(name = "EstadoNuevo", nullable = false, length = 32)
    private String estadoNuevo;

    @Column(name = "Motivo", nullable = false, length = 500)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CambiadoPor", nullable = false)
    private Usuario cambiadoPor;

    @Column(name = "CambiadoEn", nullable = false)
    private Instant cambiadoEn;

    protected HistorialEstadoBicicleta() {
    }

    public HistorialEstadoBicicleta(
            Bicicleta bicicleta,
            String estadoAnterior,
            String estadoNuevo,
            String motivo,
            Usuario cambiadoPor) {
        this.bicicleta = bicicleta;
        this.estadoAnterior = estadoAnterior;
        this.estadoNuevo = estadoNuevo;
        this.motivo = motivo;
        this.cambiadoPor = cambiadoPor;
        this.cambiadoEn = Instant.now();
    }

    public Long obtenerIdHistorialEstadoBicicleta() {
        return idHistorialEstadoBicicleta;
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
