package gt.gob.parqueerickbarrondo.areas.api;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioAdministracionAreas;
import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioAlmacenamientoImagenesArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioCategoriaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioConexionMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioHistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioNodoMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresApi;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorAdministracionAreas.class)
@Import({
    ConfiguracionSeguridad.class,
    ManejadorErroresSeguridad.class,
    ManejadorErroresApi.class,
    ServicioAdministracionAreas.class
})
class ControladorAdministracionAreasPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private RepositorioCategoriaArea repositorioCategoria;
    @MockitoBean
    private RepositorioArea repositorioArea;
    @MockitoBean
    private RepositorioHistorialEstadoArea repositorioHistorial;
    @MockitoBean
    private RepositorioNodoMapa repositorioNodo;
    @MockitoBean
    private RepositorioConexionMapa repositorioConexion;
    @MockitoBean
    private RepositorioReservaArea repositorioReserva;
    @MockitoBean
    private RepositorioUsuario repositorioUsuario;
    @MockitoBean
    private ServicioAuditoria servicioAuditoria;
    @MockitoBean
    private ServicioAlmacenamientoImagenesArea servicioAlmacenamiento;
    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;
    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void exigeSesionParaConsultarAreasAdministradas() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/categorias-areas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "EVENTOLEER")
    void rechazaUnaSesionSinPermisoDeAreas() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/categorias-areas"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"));
    }

    @Test
    @WithMockUser(authorities = "AREALEER")
    void permiteConsultarConElPermisoAplicable() throws Exception {
        when(repositorioCategoria.findAllByOrderByNombreAsc()).thenReturn(List.of());

        clienteApi.perform(get("/api/v1/administracion/categorias-areas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
