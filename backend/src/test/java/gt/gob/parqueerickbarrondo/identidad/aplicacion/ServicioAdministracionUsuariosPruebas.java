package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudEmpleadoAdministrado;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRolAdministrado;
import gt.gob.parqueerickbarrondo.identidad.dominio.Permiso;
import gt.gob.parqueerickbarrondo.identidad.dominio.Rol;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioPermiso;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioTokenRestablecimientoContrasena;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioTokenVerificacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
                mock(ServicioAuditoria.class),
                mock(RepositorioTokenRestablecimientoContrasena.class),
                mock(RepositorioTokenVerificacionCorreo.class),
                mock(ServicioAlmacenamientoFotosPerfil.class));

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
                        "Empleado", "Prueba", "EMPLEADO@PARQUE.LOCAL", "1234567890101", "55555555",
                        java.time.LocalDate.of(1990, 1, 1), "Contrasena inicial segura", Set.of()),
                mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("correo electrónico");
    }

    @Test
    void rechazaCrearUnEmpleadoSinUnRolDeEmpleado() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        var servicio = crearServicio(repositorioUsuario, mock(RepositorioRol.class), mock(RepositorioPermiso.class));

        assertThatThrownBy(() -> servicio.crearEmpleado(
                new SolicitudEmpleadoAdministrado(
                        "Empleado", "Prueba", "empleado@parque.local", "1234567890101", "55555555",
                        java.time.LocalDate.of(1990, 1, 1), "Contrasena inicial segura", Set.of()),
                mock(UsuarioSesion.class)))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("al menos un rol de empleado");
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

    @Test
    void impideEliminarElUltimoAdministradorActivo() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        var repositorioRol = mock(RepositorioRol.class);
        var usuario = mock(Usuario.class);
        var rolAdministrador = mock(Rol.class);
        var actor = mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(1L);
        when(usuario.obtenerEstado()).thenReturn("ACTIVO");
        when(usuario.obtenerVersion()).thenReturn(3L);
        when(usuario.obtenerRoles()).thenReturn(Set.of(rolAdministrador));
        when(rolAdministrador.obtenerCodigo()).thenReturn("ADMINISTRADOR");
        when(repositorioRol.bloquearPorCodigo("ADMINISTRADOR")).thenReturn(java.util.Optional.of(rolAdministrador));
        when(repositorioUsuario.buscarConPermisosPorId(2L)).thenReturn(java.util.Optional.of(usuario));
        when(repositorioUsuario.contarAdministradoresActivos()).thenReturn(1L);
        var servicio = crearServicio(repositorioUsuario, repositorioRol, mock(RepositorioPermiso.class));

        assertThatThrownBy(() -> servicio.eliminarCuenta(2L, 3L, actor))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("último administrador");
    }

    @Test
    void permiteEliminarUnAdministradorCuandoQuedaOtroActivo() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        var repositorioRol = mock(RepositorioRol.class);
        var repositorioRestablecimiento = mock(RepositorioTokenRestablecimientoContrasena.class);
        var repositorioVerificacion = mock(RepositorioTokenVerificacionCorreo.class);
        var codificador = mock(PasswordEncoder.class);
        var usuario = mock(Usuario.class);
        var rolAdministrador = mock(Rol.class);
        var actor = mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(1L);
        when(usuario.obtenerIdUsuario()).thenReturn(2L);
        when(usuario.obtenerEstado()).thenReturn("ACTIVO");
        when(usuario.obtenerVersion()).thenReturn(3L);
        when(usuario.obtenerRoles()).thenReturn(Set.of(rolAdministrador));
        when(rolAdministrador.obtenerCodigo()).thenReturn("ADMINISTRADOR");
        when(rolAdministrador.obtenerPermisos()).thenReturn(Set.of());
        when(repositorioRol.bloquearPorCodigo("ADMINISTRADOR")).thenReturn(java.util.Optional.of(rolAdministrador));
        when(repositorioUsuario.buscarConPermisosPorId(2L)).thenReturn(java.util.Optional.of(usuario));
        when(repositorioUsuario.contarAdministradoresActivos()).thenReturn(2L);
        when(codificador.encode(org.mockito.ArgumentMatchers.anyString())).thenReturn("hash-inutilizable");
        var servicio = new ServicioAdministracionUsuarios(
                repositorioUsuario, repositorioRol, mock(RepositorioPermiso.class),
                mock(SessionRegistry.class), codificador, new NormalizadorCorreo(),
                new PoliticaContrasena(12), mock(ServicioAuditoria.class),
                repositorioRestablecimiento, repositorioVerificacion,
                mock(ServicioAlmacenamientoFotosPerfil.class));

        TransactionSynchronizationManager.initSynchronization();
        try {
            servicio.eliminarCuenta(2L, 3L, actor);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }

        verify(repositorioRestablecimiento).deleteAllByUsuario_IdUsuario(2L);
        verify(repositorioVerificacion).deleteAllByUsuario_IdUsuario(2L);
        verify(usuario).eliminarCuenta("cuenta-eliminada-2@anonimo.invalid", "hash-inutilizable");
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
                mock(ServicioAuditoria.class),
                mock(RepositorioTokenRestablecimientoContrasena.class),
                mock(RepositorioTokenVerificacionCorreo.class),
                mock(ServicioAlmacenamientoFotosPerfil.class));
    }
}
