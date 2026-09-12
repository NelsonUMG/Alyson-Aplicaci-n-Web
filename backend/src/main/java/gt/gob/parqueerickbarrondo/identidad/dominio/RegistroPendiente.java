package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.time.Instant;
import java.time.LocalDate;
import jakarta.persistence.*;

@Entity
@Table(name = "RegistrosPendientes", schema = "dbo")
public class RegistroPendiente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdRegistroPendiente")
    private Long id;
    @Column(name = "CorreoNormalizado", nullable = false, length = 254, unique = true)
    private String correo;
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
    @Column(name = "HashContrasena", nullable = false, length = 255)
    private String hashContrasena;
    @Column(name = "HashToken", nullable = false, unique = true, columnDefinition = "varbinary(32)")
    private byte[] hashToken;
    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;
    @Column(name = "ExpiraEn", nullable = false)
    private Instant expiraEn;
    protected RegistroPendiente() { }
    public RegistroPendiente(String correo, String nombre, String apellido, String dpi, String celular,
            LocalDate fechaNacimiento, String hashContrasena) {
        this.correo = correo;
        actualizarDatos(nombre, apellido, dpi, celular, fechaNacimiento, hashContrasena);
    }
    public void actualizarDatos(String nombre, String apellido, String dpi, String celular,
            LocalDate fechaNacimiento, String hashContrasena) {
        this.nombre = nombre; this.apellido = apellido; this.dpi = dpi; this.celular = celular;
        this.fechaNacimiento = fechaNacimiento; this.hashContrasena = hashContrasena;
    }
    public void renovarToken(byte[] hash, Instant ahora, Instant expira) {
        hashToken = hash.clone(); creadoEn = ahora; expiraEn = expira;
    }
    public Usuario crearUsuarioVerificado(Instant ahora) {
        var usuario = new Usuario(correo, nombre, apellido, hashContrasena, null, dpi, celular, fechaNacimiento);
        usuario.requerirVerificacionCorreo();
        usuario.confirmarCorreo(ahora);
        return usuario;
    }
    public Long obtenerId() { return id; }
    public String obtenerCorreo() { return correo; }
    public String obtenerNombre() { return nombre; }
    public String obtenerDpi() { return dpi; }
    public Instant obtenerCreadoEn() { return creadoEn; }
    public boolean estaExpirado(Instant ahora) { return !expiraEn.isAfter(ahora); }
}
