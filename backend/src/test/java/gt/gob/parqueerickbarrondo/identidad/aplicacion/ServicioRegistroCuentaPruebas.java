package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.dominio.*;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class ServicioRegistroCuentaPruebas {
    final RepositorioUsuario usuarios = mock(RepositorioUsuario.class);
    final RepositorioRol roles = mock(RepositorioRol.class);
    final RepositorioRegistroPendiente pendientes = mock(RepositorioRegistroPendiente.class);
    final PasswordEncoder codificador = mock(PasswordEncoder.class);
    final EnviadorCorreoVerificacion correo = mock(EnviadorCorreoVerificacion.class);
    final ServicioRegistroCuenta servicio = new ServicioRegistroCuenta(usuarios, roles, pendientes, codificador,
            new NormalizadorCorreo(), new PoliticaContrasena(12), mock(ServicioAuditoria.class), correo, 24, 5);

    @Test void guardaUnaSolicitudSinCrearUsuarioNiAsignarRoles() {
        when(codificador.encode(anyString())).thenReturn("hash-seguro");
        assertThat(servicio.registrar(solicitud("Contrasena larga de prueba"))).isTrue();
        var captura = ArgumentCaptor.forClass(RegistroPendiente.class);
        verify(pendientes).saveAndFlush(captura.capture());
        var datos = captura.getValue().crearUsuarioVerificado(Instant.now());
        assertThat(datos.obtenerDpi()).isEqualTo("1234567890101");
        assertThat(datos.obtenerCelular()).isEqualTo("55551234");
        assertThat(datos.obtenerHashContrasena()).isEqualTo("hash-seguro");
        assertThat(datos.obtenerFechaNacimiento()).isEqualTo(LocalDate.of(1995, 4, 10));
        verify(usuarios, never()).saveAndFlush(any());
        verifyNoInteractions(roles);
        verify(correo).enviar(eq("persona@ejemplo.com"), eq("Persona"), anyString());
    }
    @Test void soloCreaElUsuarioVerificadoAlConfirmarElToken() {
        var pendiente = pendiente(Instant.now().plusSeconds(3600));
        when(pendientes.findByHashToken(any())).thenReturn(Optional.of(pendiente));
        when(roles.findByCodigo("USUARIOREGISTRADO"))
                .thenReturn(Optional.of(new Rol("USUARIOREGISTRADO", "Usuario", "", Set.of())));
        when(usuarios.saveAndFlush(any())).thenAnswer(i -> {
            Usuario u = i.getArgument(0); ReflectionTestUtils.setField(u, "idUsuario", 7L); return u;
        });
        assertThat(servicio.confirmarPendiente("token")).isTrue();
        var captura = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captura.capture());
        assertThat(captura.getValue().estaActivo()).isTrue();
        assertThat(captura.getValue().obtenerCorreoVerificadoEn()).isNotNull();
        assertThat(captura.getValue().obtenerRoles()).hasSize(1);
        verify(pendientes).delete(pendiente);
    }
    @Test void rechazaUnTokenVencidoSinCrearCuenta() {
        when(pendientes.findByHashToken(any())).thenReturn(Optional.of(pendiente(Instant.now().minusSeconds(1))));
        assertThatThrownBy(() -> servicio.confirmarPendiente("token")).isInstanceOf(SolicitudInvalidaException.class);
        verify(usuarios, never()).saveAndFlush(any());
    }
    @Test void compruebaDeNuevoLaUnicidadDelDpiAlConfirmar() {
        when(pendientes.findByHashToken(any())).thenReturn(Optional.of(pendiente(Instant.now().plusSeconds(3600))));
        when(usuarios.existsByDpi("1234567890101")).thenReturn(true);
        assertThatThrownBy(() -> servicio.confirmarPendiente("token"))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessage("El DPI o CUI ya está registrado. Por favor, inicia sesión con tu correo registrado.");
        verify(usuarios, never()).saveAndFlush(any());
    }
    @Test void rechazaUnaConfirmacionDistinta() {
        assertThatThrownBy(() -> servicio.registrar(solicitud("Otra contraseña"))).isInstanceOf(SolicitudInvalidaException.class);
        verifyNoInteractions(pendientes);
    }
    @Test void conservaSoloLaSolicitudSiFallaSmtp() {
        doThrow(new IllegalStateException("SMTP")).when(correo).enviar(any(), any(), any());
        assertThat(servicio.registrar(solicitud("Contrasena larga de prueba"))).isFalse();
        verify(usuarios, never()).saveAndFlush(any());
        verify(pendientes).saveAndFlush(any());
    }
    @Test void limitaReenviosDeUnRegistroReciente() {
        when(pendientes.findByCorreo("persona@ejemplo.com"))
                .thenReturn(Optional.of(pendiente(Instant.now().plusSeconds(3600))));
        assertThat(servicio.reenviarPendiente("Persona@Ejemplo.com")).isTrue();
        verifyNoInteractions(correo);
    }
    private RegistroPendiente pendiente(Instant expira) {
        var p = new RegistroPendiente("persona@ejemplo.com", "Persona", "Prueba", "1234567890101", "55551234",
                LocalDate.of(1995, 4, 10), "hash-seguro");
        p.renovarToken(new byte[32], Instant.now(), expira);
        return p;
    }
    private SolicitudRegistroCuenta solicitud(String confirmacion) {
        return new SolicitudRegistroCuenta("1234567890101", "Persona", "Prueba", "55551234",
                LocalDate.of(1995, 4, 10), "persona@ejemplo.com", "Contrasena larga de prueba", confirmacion);
    }
}
