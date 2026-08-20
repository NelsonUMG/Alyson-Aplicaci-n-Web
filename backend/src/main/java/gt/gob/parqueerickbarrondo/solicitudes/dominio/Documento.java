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
@Table(name = "Documentos", schema = "dbo")
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdDocumento")
    private Long idDocumento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuarioPropietario", nullable = false)
    private Usuario usuarioPropietario;

    @Column(name = "TipoDocumento", nullable = false, length = 64)
    private String tipoDocumento;

    @Column(name = "ClaveAlmacenamiento", nullable = false, length = 500)
    private String claveAlmacenamiento;

    @Column(name = "NombreArchivoOriginal", nullable = false, length = 255)
    private String nombreArchivoOriginal;

    @Column(name = "TipoMedio", nullable = false, length = 100)
    private String tipoMedio;

    @Column(name = "TamanoBytes", nullable = false)
    private long tamanoBytes;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected Documento() {
    }

    public Documento(
            Usuario propietario,
            String tipoDocumento,
            String claveAlmacenamiento,
            String nombreArchivoOriginal,
            String tipoMedio,
            long tamanoBytes) {
        var ahora = Instant.now();
        this.usuarioPropietario = propietario;
        this.tipoDocumento = tipoDocumento;
        this.claveAlmacenamiento = claveAlmacenamiento;
        this.nombreArchivoOriginal = nombreArchivoOriginal;
        this.tipoMedio = tipoMedio;
        this.tamanoBytes = tamanoBytes;
        this.estado = "ACTIVO";
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdDocumento() { return idDocumento; }
    public Usuario obtenerUsuarioPropietario() { return usuarioPropietario; }
    public String obtenerTipoDocumento() { return tipoDocumento; }
    public String obtenerClaveAlmacenamiento() { return claveAlmacenamiento; }
    public String obtenerNombreArchivoOriginal() { return nombreArchivoOriginal; }
    public String obtenerTipoMedio() { return tipoMedio; }
    public long obtenerTamanoBytes() { return tamanoBytes; }
    public String obtenerEstado() { return estado; }
    public Instant obtenerCreadoEn() { return creadoEn; }

    public void marcarEliminado() {
        estado = "ELIMINADO";
        actualizadoEn = Instant.now();
    }
}
