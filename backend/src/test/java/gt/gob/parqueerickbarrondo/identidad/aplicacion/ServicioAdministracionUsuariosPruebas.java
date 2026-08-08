package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudEmpleadoAdministrado;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRolAdministrado;
import gt.gob.parqueerickbarrondo.identidad.dominio.Permiso;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioPermiso;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;

class ServicioAdministracionUsuariosPruebas {

    @Test
    void rechazaUnaBusquedaExcesivamenteLarga() {
        var servicio = new ServicioAdministracionUsuarios(
                mock(RepositorioUsuario.class),
                mock(RepositorioRol.class),
                mock(RepositorioPermiso.class),
                mock(SessionRegistry.class),
                mock(PasswordEncoder.class),
                new NormalizadorCorreo(),
                new PoliticaContrasena(12),
                mock(ServicioAuditoria.class));

        assertThatThrownBy(() -> servicio.listar("a".repeat(101), 0, 20))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("100 caracteres");
    }

    @Test
    void rechazaCrearUnEmpleadoConCorreoYaRegistrado() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        when(repositorioUsuario.existsByCorreoNormalizado("empleado@parque.local")).thenReturn(true);
        var servicio = crearServicio(repositorioUsuario, mock(RepositorioRol.class), mock(RepositorioPermiso.class));

        assertThatThrownBy(() -> servicio.crearEmpleado(
                new SolicitudEmpleadoAdministrado(
                        "Empleado", "Prueba", "EMPLEADO@PARQUE.LOCAL", "Contrasena inicial segura", Set.of()),
                mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("correo electrónico");
    }

    @Test
    void impideCrearUnRolConPermisosQueElActorNoTiene() {
        var repositorioRol = mock(RepositorioRol.class);
        var repositorioPermiso = mock(RepositorioPermiso.class);
        var permiso = mock(Permiso.class);
        when(permiso.obtenerCodigo()).thenReturn("ROLGESTIONAR");
        when(repositorioPermiso.findAllByCodigoIn(Set.of("ROLGESTIONAR"))).thenReturn(List.of(permiso));
        var actor = mock(UsuarioSesion.class);
        when(actor.obtenerPermisos()).thenReturn(Set.of());
        var servicio = crearServicio(mock(RepositorioUsuario.class), repositorioRol, repositorioPermiso);

        assertThatThrownBy(() -> servicio.crearRol(
                new SolicitudRolAdministrado("Coordinación", "", Set.of("ROLGESTIONAR")), actor))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("No puedes asignar permisos");
    }

    private ServicioAdministracionUsuarios crearServicio(
            RepositorioUsuario repositorioUsuario,
            RepositorioRol repositorioRol,
            RepositorioPermiso repositorioPermiso) {
        return new ServicioAdministracionUsuarios(
                repositorioUsuario,
                repositorioRol,
                repositorioPermiso,
                mock(SessionRegistry.class),
                mock(PasswordEncoder.class),
                new NormalizadorCorreo(),
                new PoliticaContrasena(12),
                mock(ServicioAuditoria.class));
    }
}
