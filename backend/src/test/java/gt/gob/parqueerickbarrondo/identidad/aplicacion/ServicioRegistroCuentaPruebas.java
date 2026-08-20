package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.dominio.Rol;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class ServicioRegistroCuentaPruebas {

    @Test
    void rechazaLaConfirmacionDeContrasenaDistinta() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        var servicio = crearServicio(repositorioUsuario);

        assertThatThrownBy(() -> servicio.registrar(solicitudValida("Otra contrasena segura")))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("no coinciden");

        verify(repositorioUsuario, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rechazaUnDpiYaRegistrado() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        when(repositorioUsuario.existsByDpi("1234567890101")).thenReturn(true);
        var servicio = crearServicio(repositorioUsuario);

        assertThatThrownBy(() -> servicio.registrar(solicitudValida("Contrasena larga de prueba")))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("DPI/CUI");

        verify(repositorioUsuario, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void guardaLosDatosPersonalesYUnicamenteElHashDeLaContrasena() {
        var repositorioUsuario = mock(RepositorioUsuario.class);
        var repositorioRol = mock(RepositorioRol.class);
        var codificador = mock(PasswordEncoder.class);
        var auditoria = mock(ServicioAuditoria.class);
        var verificacionCorreo = mock(ServicioVerificacionCorreo.class);
        when(repositorioRol.findByCodigo("USUARIOREGISTRADO"))
                .thenReturn(Optional.of(new Rol("USUARIOREGISTRADO", "Usuario registrado", "", Set.of())));
        when(codificador.encode("Contrasena larga de prueba")).thenReturn("{bcrypt}hash-seguro");
        when(repositorioUsuario.saveAndFlush(org.mockito.ArgumentMatchers.any(Usuario.class)))
                .thenAnswer(invocacion -> {
                    Usuario usuario = invocacion.getArgument(0);
                    ReflectionTestUtils.setField(usuario, "idUsuario", 7L);
                    return usuario;
                });
        var servicio = new ServicioRegistroCuenta(
                repositorioUsuario,
                repositorioRol,
                codificador,
                new NormalizadorCorreo(),
                new PoliticaContrasena(12),
                auditoria,
                verificacionCorreo);

        servicio.registrar(solicitudValida("Contrasena larga de prueba"));

        var usuarioGuardado = ArgumentCaptor.forClass(Usuario.class);
        verify(repositorioUsuario).saveAndFlush(usuarioGuardado.capture());
        assertThat(usuarioGuardado.getValue().obtenerDpi()).isEqualTo("1234567890101");
        assertThat(usuarioGuardado.getValue().obtenerCelular()).isEqualTo("55551234");
        assertThat(usuarioGuardado.getValue().obtenerFechaNacimiento()).isEqualTo(LocalDate.of(1995, 4, 10));
        assertThat(usuarioGuardado.getValue().obtenerHashContrasena()).isEqualTo("{bcrypt}hash-seguro");
        assertThat(usuarioGuardado.getValue().obtenerHashContrasena())
                .isNotEqualTo("Contrasena larga de prueba");
        assertThat(usuarioGuardado.getValue().obtenerEstado()).isEqualTo("PENDIENTEVERIFICACION");
        assertThat(usuarioGuardado.getValue().obtenerCorreoVerificadoEn()).isNull();
        verify(verificacionCorreo).crearYEnviar(usuarioGuardado.getValue());
    }

    private ServicioRegistroCuenta crearServicio(RepositorioUsuario repositorioUsuario) {
        return new ServicioRegistroCuenta(
                repositorioUsuario,
                mock(RepositorioRol.class),
                mock(PasswordEncoder.class),
                new NormalizadorCorreo(),
                new PoliticaContrasena(12),
                mock(ServicioAuditoria.class),
                mock(ServicioVerificacionCorreo.class));
    }

    private SolicitudRegistroCuenta solicitudValida(String confirmacion) {
        return new SolicitudRegistroCuenta(
                "1234567890101",
                "Persona",
                "Prueba",
                "55551234",
                LocalDate.of(1995, 4, 10),
                "persona@ejemplo.com",
                "Contrasena larga de prueba",
                confirmacion);
    }
}
