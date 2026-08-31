package gt.gob.parqueerickbarrondo.solicitudes.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresApi;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaCategoriaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaTramiteResumen;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioCatalogoTramites;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioSolicitudesUsuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorSolicitudesUsuario.class)
@Import({ConfiguracionSeguridad.class, ManejadorErroresApi.class, ManejadorErroresSeguridad.class})
class ControladorSolicitudesUsuarioPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private ServicioSolicitudesUsuario servicioSolicitudes;

    @MockitoBean
    private ServicioCatalogoTramites servicioCatalogo;

    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;

    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    @WithMockUser
    void enrutaElCatalogoSinInterpretarloComoIdentificadorDeSolicitud() throws Exception {
        when(servicioCatalogo.listarCatalogo()).thenReturn(List.of(
                new RespuestaCategoriaTramite(
                        1L,
                        "RESERVASINSTALACIONES",
                        "Reservas y uso de instalaciones",
                        List.of(new RespuestaTramiteResumen(
                                1L,
                                "RESERVACANCHAS",
                                "Reserva de canchas",
                                "Solicita una cancha del parque.",
                                true,
                                null)))));

        clienteApi.perform(get("/api/v1/solicitudes/catalogo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").value("RESERVASINSTALACIONES"))
                .andExpect(jsonPath("$[0].tramites[0].codigo").value("RESERVACANCHAS"));

        verify(servicioCatalogo).listarCatalogo();
    }

    @Test
    void eliminaUnBorradorDelUsuarioAutenticado() throws Exception {
        var usuario = mock(UsuarioSesion.class);
        when(usuario.obtenerIdUsuario()).thenReturn(7L);
        var autenticacion = new UsernamePasswordAuthenticationToken(usuario, null, List.of());

        clienteApi.perform(delete("/api/v1/solicitudes/44")
                        .with(authentication(autenticacion)).with(csrf()))
                .andExpect(status().isNoContent());

        verify(servicioSolicitudes).eliminarBorrador(44L, 7L);
    }
}
