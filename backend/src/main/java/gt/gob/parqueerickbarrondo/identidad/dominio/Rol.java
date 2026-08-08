package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "Roles", schema = "dbo")
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdRol")
    private Long idRol;

    @Column(name = "Codigo", nullable = false, length = 64)
    private String codigo;

    @Column(name = "Nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "Descripcion", length = 300)
    private String descripcion;

    @Column(name = "Activo", nullable = false)
    private boolean activo;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "RolesPermisos",
            schema = "dbo",
            joinColumns = @JoinColumn(name = "IdRol"),
            inverseJoinColumns = @JoinColumn(name = "IdPermiso"))
    private Set<Permiso> permisos = new LinkedHashSet<>();

    protected Rol() {
    }

    public Rol(String codigo, String nombre, String descripcion, Set<Permiso> permisos) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.activo = true;
        this.permisos.addAll(permisos);
        this.version = null;
    }

    public Long obtenerIdRol() {
        return idRol;
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

    public boolean estaActivo() {
        return activo;
    }

    public Long obtenerVersion() {
        return version;
    }

    public Set<Permiso> obtenerPermisos() {
        return Set.copyOf(permisos);
    }

    @Override
    public boolean equals(Object objeto) {
        if (this == objeto) {
            return true;
        }
        if (!(objeto instanceof Rol otroRol)) {
            return false;
        }
        return idRol != null && Objects.equals(idRol, otroRol.idRol);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
