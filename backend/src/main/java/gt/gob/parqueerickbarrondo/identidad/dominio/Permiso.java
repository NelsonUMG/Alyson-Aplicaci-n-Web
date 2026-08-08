package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "Permisos", schema = "dbo")
public class Permiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdPermiso")
    private Long idPermiso;

    @Column(name = "Codigo", nullable = false, length = 80)
    private String codigo;

    @Column(name = "Descripcion", nullable = false, length = 300)
    private String descripcion;

    protected Permiso() {
    }

    public Long obtenerIdPermiso() {
        return idPermiso;
    }

    public String obtenerCodigo() {
        return codigo;
    }

    public String obtenerDescripcion() {
        return descripcion;
    }

    @Override
    public boolean equals(Object objeto) {
        if (this == objeto) {
            return true;
        }
        if (!(objeto instanceof Permiso otroPermiso)) {
            return false;
        }
        return idPermiso != null && Objects.equals(idPermiso, otroPermiso.idPermiso);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
