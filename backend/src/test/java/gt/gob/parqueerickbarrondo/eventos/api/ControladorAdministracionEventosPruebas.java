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
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioAdministracionEventos;
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioAlmacenamientoImagenesEvento;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenEvento;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorAdministracionEventos.class)
@Import({
    ConfiguracionSeguridad.class,
    ManejadorErroresSeguridad.class,
    ManejadorErroresApi.class,
    ServicioAdministracionEventos.class
})
class ControladorAdministracionEventosPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private RepositorioEvento repositorioEvento;
    @MockitoBean
    private RepositorioImagenEvento repositorioImagenEvento;
    @MockitoBean
    private RepositorioInscripcionEvento repositorioInscripcion;
    @MockitoBean
    private RepositorioUsuario repositorioUsuario;
    @MockitoBean
    private ServicioAuditoria servicioAuditoria;
    @MockitoBean
    private ServicioAlmacenamientoImagenesEvento servicioAlmacenamiento;
    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;
    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void exigeSesionParaConsultarEventosAdministrados() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/eventos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "PUBLICACIONLEER")
    void rechazaUnaSesionSinPermisoDeEventos() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/eventos"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"));
    }

    @Test
    @WithMockUser(authorities = "EVENTOLEER")
    void permiteConsultarConElPermisoAplicable() throws Exception {
        when(repositorioEvento.buscarAdministrados(anyString(), anyString(), any(Pageable.class)))
                .thenReturn(Page.empty());

        clienteApi.perform(get("/api/v1/administracion/eventos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }
}
