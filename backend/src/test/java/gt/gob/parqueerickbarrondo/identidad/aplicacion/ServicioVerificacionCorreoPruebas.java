package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.identidad.dominio.TokenVerificacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioTokenVerificacionCorreo;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class ServicioVerificacionCorreoPruebas {

    @Test
    void generaUnTokenAleatorioAlmacenandoSoloSuResumenYLoEnvia() {
        var repositorioToken = mock(RepositorioTokenVerificacionCorreo.class);
        var enviador = mock(EnviadorCorreoVerificacion.class);
        var servicio = crearServicio(repositorioToken, mock(RepositorioUsuario.class), enviador);
        var usuario = usuarioPendiente();
        when(repositorioToken.findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(7L)).thenReturn(List.of());

        servicio.crearYEnviar(usuario);

        var tokenGuardado = ArgumentCaptor.forClass(TokenVerificacionCorreo.class);
        verify(repositorioToken).saveAndFlush(tokenGuardado.capture());
        assertThat(tokenGuardado.getValue().obtenerUsuario()).isSameAs(usuario);
        assertThat(tokenGuardado.getValue().obtenerExpiraEn()).isAfter(Instant.now().plusSeconds(23 * 60 * 60));
        var tokenEnviado = ArgumentCaptor.forClass(String.class);
        verify(enviador).enviar(org.mockito.ArgumentMatchers.eq("persona@ejemplo.com"),
                org.mockito.ArgumentMatchers.eq("Persona"), tokenEnviado.capture());
        assertThat(tokenEnviado.getValue()).hasSize(43).doesNotContain("=");
    }

    @Test
    void confirmaElCorreoActivaLaCuentaYConsumeElToken() {
        var repositorioToken = mock(RepositorioTokenVerificacionCorreo.class);
        var usuario = usuarioPendiente();
        var registro = new TokenVerificacionCorreo(usuario, new byte[32], Instant.now().plusSeconds(3600), Instant.now());
        when(repositorioToken.findByHashToken(any(byte[].class))).thenReturn(Optional.of(registro));
        when(repositorioToken.findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(7L)).thenReturn(List.of(registro));
        var servicio = crearServicio(repositorioToken, mock(RepositorioUsuario.class), mock(EnviadorCorreoVerificacion.class));

        servicio.confirmar("token-seguro");

        assertThat(usuario.obtenerEstado()).isEqualTo("ACTIVO");
        assertThat(usuario.obtenerCorreoVerificadoEn()).isNotNull();
        assertThat(registro.obtenerConsumidoEn()).isNotNull();
    }

    @Test
    void rechazaUnTokenVencidoSinActivarLaCuenta() {
        var repositorioToken = mock(RepositorioTokenVerificacionCorreo.class);
        var usuario = usuarioPendiente();
        var registro = new TokenVerificacionCorreo(usuario, new byte[32], Instant.now().minusSeconds(1), Instant.now().minusSeconds(3600));
        when(repositorioToken.findByHashToken(any(byte[].class))).thenReturn(Optional.of(registro));
        var servicio = crearServicio(repositorioToken, mock(RepositorioUsuario.class), mock(EnviadorCorreoVerificacion.class));

        assertThatThrownBy(() -> servicio.confirmar("token-vencido"))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("venció");
        assertThat(usuario.obtenerEstado()).isEqualTo("PENDIENTEVERIFICACION");
    }

    @Test
    void evitaReenviosRepetidosDuranteLaEsperaConfigurada() {
        var repositorioToken = mock(RepositorioTokenVerificacionCorreo.class);
        var repositorioUsuario = mock(RepositorioUsuario.class);
        var enviador = mock(EnviadorCorreoVerificacion.class);
        var usuario = usuarioPendiente();
        var reciente = new TokenVerificacionCorreo(usuario, new byte[32], Instant.now().plusSeconds(3600), Instant.now());
        when(repositorioUsuario.buscarPorCorreoParaVerificacion("persona@ejemplo.com"))
                .thenReturn(Optional.of(usuario));
        when(repositorioToken.findFirstByUsuario_IdUsuarioOrderByCreadoEnDesc(7L))
                .thenReturn(Optional.of(reciente));
        var servicio = crearServicio(repositorioToken, repositorioUsuario, enviador);

        servicio.reenviar(" Persona@Ejemplo.com ");

        verify(repositorioToken, never()).saveAndFlush(any());
        verify(enviador, never()).enviar(any(), any(), any());
    }

    private ServicioVerificacionCorreo crearServicio(
            RepositorioTokenVerificacionCorreo repositorioToken,
            RepositorioUsuario repositorioUsuario,
            EnviadorCorreoVerificacion enviador) {
        return new ServicioVerificacionCorreo(
                repositorioToken,
                repositorioUsuario,
                new NormalizadorCorreo(),
                enviador,
                mock(ServicioAuditoria.class),
                24,
                5);
    }

    private Usuario usuarioPendiente() {
        var usuario = new Usuario("persona@ejemplo.com", "Persona", "Prueba", "{bcrypt}hash", null);
        usuario.requerirVerificacionCorreo();
        ReflectionTestUtils.setField(usuario, "idUsuario", 7L);
        return usuario;
    }
}
