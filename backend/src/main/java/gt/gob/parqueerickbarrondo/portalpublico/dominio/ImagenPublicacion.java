package gt.gob.parqueerickbarrondo.portalpublico.dominio;

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
@Table(name = "ImagenesPublicacion", schema = "dbo")
public class ImagenPublicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdImagenPublicacion")
    private Long idImagenPublicacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdPublicacion", nullable = false)
    private Publicacion publicacion;

    @Column(name = "ClaveAlmacenamiento", nullable = false, length = 500)
    private String claveAlmacenamiento;

    @Column(name = "NombreArchivoOriginal", nullable = false, length = 255)
    private String nombreArchivoOriginal;

    @Column(name = "TipoMedio", nullable = false, length = 100)
    private String tipoMedio;

    @Column(name = "TamanoBytes", nullable = false)
    private long tamanoBytes;

    @Column(name = "AnchoPixeles", nullable = false)
    private int anchoPixeles;

    @Column(name = "AltoPixeles", nullable = false)
    private int altoPixeles;

    @Column(name = "TextoAlternativo", nullable = false, length = 255)
    private String textoAlternativo;

    @Column(name = "OrdenVisualizacion", nullable = false)
    private short ordenVisualizacion;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    protected ImagenPublicacion() {
    }

    public ImagenPublicacion(
            Publicacion publicacion,
            String claveAlmacenamiento,
            String nombreArchivoOriginal,
            String tipoMedio,
            long tamanoBytes,
            int anchoPixeles,
            int altoPixeles,
            String textoAlternativo,
            short ordenVisualizacion) {
        this.publicacion = publicacion;
        this.claveAlmacenamiento = claveAlmacenamiento;
        this.nombreArchivoOriginal = nombreArchivoOriginal;
        this.tipoMedio = tipoMedio;
        this.tamanoBytes = tamanoBytes;
        this.anchoPixeles = anchoPixeles;
        this.altoPixeles = altoPixeles;
        this.textoAlternativo = textoAlternativo;
        this.ordenVisualizacion = ordenVisualizacion;
        this.creadoEn = Instant.now();
    }

    public Long obtenerIdImagenPublicacion() {
        return idImagenPublicacion;
    }

    public Publicacion obtenerPublicacion() {
        return publicacion;
    }

    public String obtenerClaveAlmacenamiento() {
        return claveAlmacenamiento;
    }

    public String obtenerNombreArchivoOriginal() {
        return nombreArchivoOriginal;
    }

    public String obtenerTipoMedio() {
        return tipoMedio;
    }

    public long obtenerTamanoBytes() {
        return tamanoBytes;
    }

    public int obtenerAnchoPixeles() {
        return anchoPixeles;
    }

    public int obtenerAltoPixeles() {
        return altoPixeles;
    }

    public String obtenerTextoAlternativo() {
        return textoAlternativo;
    }

    public short obtenerOrdenVisualizacion() {
        return ordenVisualizacion;
    }
}
