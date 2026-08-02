package gt.gob.parqueerickbarrondo.identidad.seguridad;

import java.io.Serial;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

import gt.gob.parqueerickbarrondo.identidad.dominio.Rol;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class UsuarioSesion implements UserDetails {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long idUsuario;
    private final String correo;
    private final String nombre;
    private final String apellido;
    private final String hashContrasena;
    private final String estado;
    private final Set<String> roles;
    private final Set<String> permisos;
    private final List<GrantedAuthority> autoridades;

    public UsuarioSesion(Usuario usuario) {
        idUsuario = usuario.obtenerIdUsuario();
        correo = usuario.obtenerCorreoNormalizado();
        nombre = usuario.obtenerNombre();
        apellido = usuario.obtenerApellido();
        hashContrasena = usuario.obtenerHashContrasena();
        estado = usuario.obtenerEstado();

        var codigosRoles = new TreeSet<String>();
        var codigosPermisos = new TreeSet<String>();
        for (Rol rol : usuario.obtenerRoles()) {
            if (!rol.estaActivo()) {
                continue;
            }
            codigosRoles.add(rol.obtenerCodigo());
            rol.obtenerPermisos().forEach(permiso -> codigosPermisos.add(permiso.obtenerCodigo()));
        }
        roles = Set.copyOf(codigosRoles);
        permisos = Set.copyOf(codigosPermisos);
        autoridades = codigosPermisos.stream().map(SimpleGrantedAuthority::new).map(GrantedAuthority.class::cast).toList();
    }

    public Long obtenerIdUsuario() {
        return idUsuario;
    }

    public String obtenerCorreo() {
        return correo;
    }

    public String obtenerNombre() {
        return nombre;
    }

    public String obtenerApellido() {
        return apellido;
    }

    public Set<String> obtenerRoles() {
        return roles;
    }

    public Set<String> obtenerPermisos() {
        return permisos;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return autoridades;
    }

    @Override
    public String getPassword() {
        return hashContrasena;
    }

    @Override
    public String getUsername() {
        return correo;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"BLOQUEADO".equals(estado);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return "ACTIVO".equals(estado);
    }

    @Override
    public boolean equals(Object objeto) {
        if (this == objeto) {
            return true;
        }
        return objeto instanceof UsuarioSesion otro && Objects.equals(idUsuario, otro.idUsuario);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idUsuario);
    }
}
