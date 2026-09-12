package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.time.*;
import java.util.*;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRestablecerContrasena;
import gt.gob.parqueerickbarrondo.identidad.dominio.*;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.*;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class ServicioRecuperacionContrasenaPruebas {
    final RepositorioUsuario usuarios = mock(RepositorioUsuario.class);
    final RepositorioTokenRestablecimientoContrasena tokens = mock(RepositorioTokenRestablecimientoContrasena.class);
    final PasswordEncoder codificador = mock(PasswordEncoder.class);
    final EnviadorCorreoRecuperacion correo = mock(EnviadorCorreoRecuperacion.class);
    final SessionRegistryImpl sesiones = new SessionRegistryImpl();
    final ServicioRecuperacionContrasena servicio = new ServicioRecuperacionContrasena(usuarios, tokens,
            new NormalizadorCorreo(), codificador, new PoliticaContrasena(12), correo, mock(ServicioAuditoria.class), sesiones);
    Usuario usuario;

    @BeforeEach void preparar() {
        usuario = new Usuario("persona@example.com", "Persona", "Prueba", "hash-anterior", null);
        usuario.requerirVerificacionCorreo(); usuario.confirmarCorreo(Instant.now());
        ReflectionTestUtils.setField(usuario, "idUsuario", 7L);
        when(usuarios.buscarPorCorreoParaVerificacion("persona@example.com")).thenReturn(Optional.of(usuario));
    }
    @Test void emiteUnTokenAleatorioCuyoHashVenceExactamenteEnUnaHora() {
        servicio.solicitar(" Persona@Example.com ");
        var registro = ArgumentCaptor.forClass(TokenRestablecimientoContrasena.class);
        var valor = ArgumentCaptor.forClass(String.class);
        verify(tokens).saveAndFlush(registro.capture());
        verify(correo).enviar(eq("persona@example.com"), eq("Persona"), valor.capture());
        assertThat(valor.getValue()).hasSize(43);
        assertThat(Duration.between(registro.getValue().obtenerCreadoEn(), registro.getValue().obtenerExpiraEn())).isEqualTo(Duration.ofHours(1));
        assertThat((byte[]) ReflectionTestUtils.getField(registro.getValue(), "hashToken")).isEqualTo(TokensSeguros.resumir(valor.getValue()));
        assertThat(usuario.obtenerHashContrasena()).isEqualTo("hash-anterior");
    }
    @Test void noEnviaParaCorreosDesconocidosOPendientes() {
        servicio.solicitar("ausente@example.com");
        usuario.requerirVerificacionCorreo();
        servicio.solicitar("persona@example.com");
        verifyNoInteractions(correo, tokens);
    }
    @Test void evitaCorreosRepetidosDuranteCincoMinutos() {
        when(tokens.findFirstByUsuario_IdUsuarioOrderByCreadoEnDesc(7L)).thenReturn(Optional.of(registro(Instant.now().plusSeconds(3600))));
        servicio.solicitar("persona@example.com");
        verifyNoInteractions(correo);
    }
    @Test void rechazaUnTokenVencidoOConsumido() {
        var registro = prepararToken(Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> servicio.restablecer(solicitud())).isInstanceOf(SolicitudInvalidaException.class);
        registro = prepararToken(Instant.now().plusSeconds(3600));
        registro.consumir(Instant.now());
        assertThatThrownBy(() -> servicio.restablecer(solicitud())).isInstanceOf(SolicitudInvalidaException.class);
        verifyNoInteractions(codificador);
    }
    @Test void rechazaExactamenteAlLlegarALaHoraDeVencimiento() {
        var registro = registro(Instant.now());
        assertThat(registro.estaExpirado(registro.obtenerExpiraEn())).isTrue();
    }
    @Test void cambiaLaContrasenaConsumeTodosLosEnlacesYCierraSesiones() {
        var registro = prepararToken(Instant.now().plusSeconds(3600));
        sesiones.registerNewSession("sesion-previa", new UsuarioSesion(usuario));
        when(codificador.encode(anyString())).thenReturn("hash-nuevo");
        servicio.restablecer(solicitud());
        assertThat(usuario.obtenerHashContrasena()).isEqualTo("hash-nuevo");
        assertThat(registro.obtenerConsumidoEn()).isNotNull();
        assertThat(sesiones.getSessionInformation("sesion-previa").isExpired()).isTrue();
        assertThatThrownBy(() -> servicio.restablecer(solicitud())).isInstanceOf(SolicitudInvalidaException.class);
    }
    @Test void invalidaElEnlaceSiLaContrasenaCambioDespuesDeEmitirlo() {
        prepararToken(Instant.now().plusSeconds(3600));
        usuario.cambiarContrasena("otro-hash");
        assertThatThrownBy(() -> servicio.restablecer(solicitud())).isInstanceOf(SolicitudInvalidaException.class);
    }
    @Test void falloSmtpNoCambiaLaContrasenaNiDejaElNuevoTokenActivo() {
        doThrow(new IllegalStateException("SMTP")).when(correo).enviar(any(), any(), any());
        servicio.solicitar("persona@example.com");
        var registro = ArgumentCaptor.forClass(TokenRestablecimientoContrasena.class);
        verify(tokens).saveAndFlush(registro.capture());
        assertThat(registro.getValue().obtenerConsumidoEn()).isNotNull();
        assertThat(usuario.obtenerHashContrasena()).isEqualTo("hash-anterior");
    }
    private TokenRestablecimientoContrasena registro(Instant expira) {
        return new TokenRestablecimientoContrasena(usuario, TokensSeguros.resumir("token"), expira, Instant.now());
    }
    private TokenRestablecimientoContrasena prepararToken(Instant expira) {
        var registro = registro(expira);
        when(tokens.buscarCorreoPorHash(any())).thenReturn(Optional.of("persona@example.com"));
        when(tokens.buscarParaConsumir(any())).thenReturn(Optional.of(registro));
        when(tokens.findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(7L)).thenReturn(List.of(registro));
        return registro;
    }
    private SolicitudRestablecerContrasena solicitud() {
        return new SolicitudRestablecerContrasena("token", "Mi nueva contraseña", "Mi nueva contraseña");
    }
}
