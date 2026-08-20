package gt.gob.parqueerickbarrondo.eventos.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresApi;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioReportesInscripciones;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorReportesInscripciones.class)
@Import({
    ConfiguracionSeguridad.class,
    ManejadorErroresSeguridad.class,
    ManejadorErroresApi.class,
    ServicioReportesInscripciones.class
})
class ControladorReportesInscripcionesPruebas {

    @Autowired
    private MockMvc clienteApi;
    @MockitoBean
    private RepositorioEvento repositorioEvento;
    @MockitoBean
    private RepositorioInscripcionEvento repositorioInscripcion;
    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;
    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void exigeSesionParaConsultarReportes() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/reportes/inscripciones"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "EVENTOLEER")
    void rechazaUnaSesionSinPermisoDeReportes() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/reportes/inscripciones"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"));
    }

    @Test
    @WithMockUser(authorities = "REPORTELEER")
    void permiteConsultarElReporteConElPermisoAplicable() throws Exception {
        when(repositorioEvento.buscarAdministrados(anyString(), anyString(), any(Pageable.class)))
                .thenReturn(Page.empty());

        clienteApi.perform(get("/api/v1/administracion/reportes/inscripciones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }
}
