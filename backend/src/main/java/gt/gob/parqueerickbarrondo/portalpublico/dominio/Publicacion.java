package gt.gob.parqueerickbarrondo.portalpublico.dominio;

import java.time.Instant;
import java.time.LocalDate;

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
@Table(name = "Publicaciones", schema = "dbo")
public class Publicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdPublicacion")
    private Long idPublicacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdCategoriaPublicacion", nullable = false)
    private CategoriaPublicacion categoria;

    @Column(name = "IdUsuarioAutor", nullable = false)
    private Long idUsuarioAutor;

    @Column(name = "Titulo", nullable = false, length = 180)
    private String titulo;

    @Column(name = "IdentificadorUrl", nullable = false, length = 190)
    private String identificadorUrl;

    @Column(name = "Resumen", nullable = false, length = 500)
    private String resumen;

    @Column(name = "Contenido", nullable = false)
    private String contenido;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "FechaEditorial")
    private LocalDate fechaEditorial;

    @Column(name = "PublicadoEn")
    private Instant publicadoEn;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected Publicacion() {
    }

    public Publicacion(
            CategoriaPublicacion categoria,
            Long idUsuarioAutor,
            String titulo,
            String identificadorUrl,
            String resumen,
            String contenido,
            LocalDate fechaEditorial) {
        var ahora = Instant.now();
        this.categoria = categoria;
        this.idUsuarioAutor = idUsuarioAutor;
        this.titulo = titulo;
        this.identificadorUrl = identificadorUrl;
        this.resumen = resumen;
        this.contenido = contenido;
        this.estado = "BORRADOR";
        this.fechaEditorial = fechaEditorial;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdPublicacion() {
        return idPublicacion;
    }

    public CategoriaPublicacion obtenerCategoria() {
        return categoria;
    }

    public String obtenerTitulo() {
        return titulo;
    }

    public String obtenerIdentificadorUrl() {
        return identificadorUrl;
    }

    public String obtenerResumen() {
        return resumen;
    }

    public String obtenerContenido() {
        return contenido;
    }

    public String obtenerEstado() {
        return estado;
    }

    public LocalDate obtenerFechaEditorial() {
        return fechaEditorial;
    }

    public Instant obtenerPublicadoEn() {
        return publicadoEn;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizar(
            CategoriaPublicacion categoria,
            String titulo,
            String resumen,
            String contenido,
            LocalDate fechaEditorial) {
        this.categoria = categoria;
        this.titulo = titulo;
        this.resumen = resumen;
        this.contenido = contenido;
        this.fechaEditorial = fechaEditorial;
        this.actualizadoEn = Instant.now();
    }

    public void publicar(Instant fechaPublicacion) {
        estado = "PUBLICADA";
        publicadoEn = fechaPublicacion;
        actualizadoEn = fechaPublicacion;
    }

    public void archivar() {
        estado = "ARCHIVADA";
        actualizadoEn = Instant.now();
    }

    public void desarchivar() {
        estado = "BORRADOR";
        publicadoEn = null;
        actualizadoEn = Instant.now();
    }
}
