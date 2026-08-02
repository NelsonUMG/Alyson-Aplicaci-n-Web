package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.time.Instant;
import java.util.LinkedHashSet;
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
@Table(name = "Usuarios", schema = "dbo")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdUsuario")
    private Long idUsuario;

    @Column(name = "CorreoNormalizado", nullable = false, length = 254)
    private String correoNormalizado;

    @Column(name = "Nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "Apellido", nullable = false, length = 80)
    private String apellido;

    @Column(name = "HashContrasena", nullable = false, length = 255)
    private String hashContrasena;

    @Column(name = "Estado", nullable = false, length = 32)
    private String estado;

    @Column(name = "CorreoVerificadoEn")
    private Instant correoVerificadoEn;

    @Column(name = "BloqueadoHasta")
    private Instant bloqueadoHasta;

    @Column(name = "TerminosAceptadosEn")
    private Instant terminosAceptadosEn;

    @Column(name = "UltimoAccesoEn")
    private Instant ultimoAccesoEn;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "UsuariosRoles",
            schema = "dbo",
            joinColumns = @JoinColumn(name = "IdUsuario"),
            inverseJoinColumns = @JoinColumn(name = "IdRol"))
    private Set<Rol> roles = new LinkedHashSet<>();

    protected Usuario() {
    }

    public Usuario(
            String correoNormalizado,
            String nombre,
            String apellido,
            String hashContrasena,
            Instant terminosAceptadosEn) {
        var ahora = Instant.now();
        this.correoNormalizado = correoNormalizado;
        this.nombre = nombre;
        this.apellido = apellido;
        this.hashContrasena = hashContrasena;
        this.estado = "ACTIVO";
        this.terminosAceptadosEn = terminosAceptadosEn;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = 0L;
    }

    public Long obtenerIdUsuario() {
        return idUsuario;
    }

    public String obtenerCorreoNormalizado() {
        return correoNormalizado;
    }

    public String obtenerNombre() {
        return nombre;
    }

    public String obtenerApellido() {
        return apellido;
    }

    public String obtenerHashContrasena() {
        return hashContrasena;
    }

    public String obtenerEstado() {
        return estado;
    }

    public Instant obtenerCorreoVerificadoEn() {
        return correoVerificadoEn;
    }

    public Instant obtenerBloqueadoHasta() {
        return bloqueadoHasta;
    }

    public Instant obtenerUltimoAccesoEn() {
        return ultimoAccesoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public Set<Rol> obtenerRoles() {
        return Set.copyOf(roles);
    }

    public boolean estaActivo() {
        return "ACTIVO".equals(estado);
    }

    public void agregarRol(Rol rol) {
        roles.add(rol);
        actualizadoEn = Instant.now();
    }

    public void reemplazarRoles(Set<Rol> nuevosRoles) {
        roles.clear();
        roles.addAll(nuevosRoles);
        actualizadoEn = Instant.now();
    }

    public void registrarAcceso(Instant fecha) {
        ultimoAccesoEn = fecha;
        actualizadoEn = fecha;
    }

    public void cambiarContrasena(String nuevoHash) {
        hashContrasena = nuevoHash;
        actualizadoEn = Instant.now();
    }
}
