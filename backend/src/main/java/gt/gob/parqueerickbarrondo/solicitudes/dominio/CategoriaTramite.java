package gt.gob.parqueerickbarrondo.solicitudes.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "CategoriasTramite", schema = "dbo")
public class CategoriaTramite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdCategoriaTramite")
    private Long idCategoriaTramite;

    @Column(name = "Codigo", nullable = false, length = 64)
    private String codigo;

    @Column(name = "Nombre", nullable = false, length = 160)
    private String nombre;

    @Column(name = "OrdenVisualizacion", nullable = false)
    private short ordenVisualizacion;

    @Column(name = "Activa", nullable = false)
    private boolean activa;

    protected CategoriaTramite() {
    }

    public CategoriaTramite(String codigo, String nombre, short ordenVisualizacion, boolean activa) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.ordenVisualizacion = ordenVisualizacion;
        this.activa = activa;
    }

    public Long obtenerIdCategoriaTramite() { return idCategoriaTramite; }
    public String obtenerCodigo() { return codigo; }
    public String obtenerNombre() { return nombre; }
    public short obtenerOrdenVisualizacion() { return ordenVisualizacion; }
    public boolean estaActiva() { return activa; }
}
