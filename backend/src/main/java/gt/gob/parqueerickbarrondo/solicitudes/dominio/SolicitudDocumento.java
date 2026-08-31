package gt.gob.parqueerickbarrondo.solicitudes.dominio;

import java.time.Instant;

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
@Table(name = "SolicitudesDocumentos", schema = "dbo")
public class SolicitudDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdSolicitudDocumento")
    private Long idSolicitudDocumento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdSolicitud", nullable = false)
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdDocumento", nullable = false)
    private Documento documento;

    @Column(name = "CategoriaDocumento", nullable = false, length = 64)
    private String categoriaDocumento;

    @Column(name = "Obligatorio", nullable = false)
    private boolean obligatorio;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    protected SolicitudDocumento() {
    }

    public SolicitudDocumento(Solicitud solicitud, Documento documento, String categoriaDocumento) {
        this(solicitud, documento, categoriaDocumento, false);
    }

    public SolicitudDocumento(Solicitud solicitud, Documento documento,
            String categoriaDocumento, boolean obligatorio) {
        this.solicitud = solicitud;
        this.documento = documento;
        this.categoriaDocumento = categoriaDocumento;
        this.obligatorio = obligatorio;
        this.creadoEn = Instant.now();
    }

    public Long obtenerIdSolicitudDocumento() { return idSolicitudDocumento; }
    public Solicitud obtenerSolicitud() { return solicitud; }
    public Documento obtenerDocumento() { return documento; }
    public String obtenerCategoriaDocumento() { return categoriaDocumento; }
    public boolean esObligatorio() { return obligatorio; }
    public Instant obtenerCreadoEn() { return creadoEn; }
}
