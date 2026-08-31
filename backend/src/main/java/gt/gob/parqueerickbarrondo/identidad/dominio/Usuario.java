package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.time.Instant;
import java.time.LocalDate;
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

    @Column(name = "Dpi", length = 13)
    private String dpi;

    @Column(name = "Celular", length = 8)
    private String celular;

    @Column(name = "FechaNacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "DpiExtendidoEn", length = 120)
    private String dpiExtendidoEn;

    @Column(name = "Telefono", length = 24)
    private String telefono;

    @Column(name = "Direccion", length = 300)
    private String direccion;

    @Column(name = "ClaveFotoPerfil", length = 200)
    private String claveFotoPerfil;

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
        this(correoNormalizado, nombre, apellido, hashContrasena, terminosAceptadosEn,
                null, null, null);
    }

    public Usuario(
            String correoNormalizado,
            String nombre,
            String apellido,
            String hashContrasena,
            Instant terminosAceptadosEn,
            String dpi,
            String celular,
            LocalDate fechaNacimiento) {
        var ahora = Instant.now();
        this.correoNormalizado = correoNormalizado;
        this.nombre = nombre;
        this.apellido = apellido;
        this.dpi = dpi;
        this.celular = celular;
        this.fechaNacimiento = fechaNacimiento;
        this.hashContrasena = hashContrasena;
        this.estado = "ACTIVO";
        this.terminosAceptadosEn = terminosAceptadosEn;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
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

    public String obtenerDpi() {
        return dpi;
    }

    public String obtenerCelular() {
        return celular;
    }

    public LocalDate obtenerFechaNacimiento() {
        return fechaNacimiento;
    }

    public String obtenerDpiExtendidoEn() {
        return dpiExtendidoEn;
    }

    public String obtenerTelefono() {
        return telefono;
    }

    public String obtenerDireccion() {
        return direccion;
    }

    public String obtenerClaveFotoPerfil() {
        return claveFotoPerfil;
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

    public boolean estaPendienteDeVerificacion() {
        return "PENDIENTEVERIFICACION".equals(estado);
    }

    public void requerirVerificacionCorreo() {
        estado = "PENDIENTEVERIFICACION";
        correoVerificadoEn = null;
        actualizadoEn = Instant.now();
    }

    public void confirmarCorreo(Instant fecha) {
        if (!estaPendienteDeVerificacion()) {
            throw new IllegalStateException("La cuenta no está pendiente de verificación.");
        }
        estado = "ACTIVO";
        correoVerificadoEn = fecha;
        actualizadoEn = fecha;
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

    public void actualizarPerfil(
            String nombre,
            String apellido,
            String celular,
            LocalDate fechaNacimiento,
            String dpiExtendidoEn,
            String telefono,
            String direccion) {
        this.nombre = nombre.strip();
        this.apellido = apellido.strip();
        this.celular = celular.strip();
        this.fechaNacimiento = fechaNacimiento;
        this.dpiExtendidoEn = dpiExtendidoEn.strip();
        this.telefono = normalizarOpcional(telefono);
        this.direccion = normalizarOpcional(direccion);
        actualizadoEn = Instant.now();
    }

    public void cambiarFotoPerfil(String nuevaClave) {
        claveFotoPerfil = normalizarOpcional(nuevaClave);
        actualizadoEn = Instant.now();
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }
}
