package gt.gob.parqueerickbarrondo.publicaciones.api;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresApi;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ServicioAdministracionPublicaciones;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ServicioAlmacenamientoImagenesPublicacion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorAdministracionPublicaciones.class)
@Import({
    ConfiguracionSeguridad.class,
    ManejadorErroresSeguridad.class,
    ManejadorErroresApi.class,
    ServicioAdministracionPublicaciones.class
})
class ControladorAdministracionPublicacionesPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private RepositorioCategoriaPublicacion repositorioCategoria;

    @MockitoBean
    private RepositorioPublicacion repositorioPublicacion;

    @MockitoBean
    private RepositorioImagenPublicacion repositorioImagen;

    @MockitoBean
    private ServicioAlmacenamientoImagenesPublicacion servicioAlmacenamiento;

    @MockitoBean
    private ServicioAuditoria servicioAuditoria;

    @MockitoBean
    private ServicioIdempotencia servicioIdempotencia;

    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;

    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void exigeUnaSesionParaConsultarLaAdministracion() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/categorias-publicaciones"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "EVENTOLEER")
    void rechazaUnaSesionSinPermisoDePublicaciones() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/categorias-publicaciones"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"));
    }

    @Test
    @WithMockUser(authorities = "PUBLICACIONLEER")
    void permiteConsultarConElPermisoAplicable() throws Exception {
        when(repositorioCategoria.findAllByOrderByOrdenVisualizacionAscNombreAsc()).thenReturn(List.of());

        clienteApi.perform(get("/api/v1/administracion/categorias-publicaciones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
