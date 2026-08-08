package gt.gob.parqueerickbarrondo.portalpublico.dominio;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "CategoriasArea", schema = "dbo")
public class CategoriaArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdCategoriaArea")
    private Long idCategoriaArea;

    @Column(name = "Codigo", nullable = false, length = 64)
    private String codigo;

    @Column(name = "Nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "Descripcion", length = 300)
    private String descripcion;

    @Column(name = "Activa", nullable = false)
    private boolean activa;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected CategoriaArea() {
    }

    public CategoriaArea(String codigo, String nombre, String descripcion, boolean activa) {
        var ahora = Instant.now();
        this.codigo = codigo;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.activa = activa;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdCategoriaArea() {
        return idCategoriaArea;
    }

    public String obtenerCodigo() {
        return codigo;
    }

    public String obtenerNombre() {
        return nombre;
    }

    public String obtenerDescripcion() {
        return descripcion;
    }

    public boolean estaActiva() {
        return activa;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizar(String codigo, String nombre, String descripcion, boolean activa) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.activa = activa;
        this.actualizadoEn = Instant.now();
    }
}
