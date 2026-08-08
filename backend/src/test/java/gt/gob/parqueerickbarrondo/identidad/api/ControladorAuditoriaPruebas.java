package gt.gob.parqueerickbarrondo.identidad.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresApi;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioConsultaAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioEventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorAuditoria.class)
@Import({
    ConfiguracionSeguridad.class,
    ManejadorErroresSeguridad.class,
    ManejadorErroresApi.class,
    ServicioConsultaAuditoria.class
})
class ControladorAuditoriaPruebas {

    @Autowired
    private MockMvc clienteApi;
    @MockitoBean
    private RepositorioEventoAuditoria repositorioEventoAuditoria;
    @MockitoBean
    private RepositorioUsuario repositorioUsuario;
    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;
    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void exigeSesionParaConsultarAuditoria() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/auditoria"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "EVENTOLEER")
    void rechazaUnaSesionSinPermisoDeReportes() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/auditoria"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"));
    }

    @Test
    @WithMockUser(authorities = "REPORTELEER")
    void permiteLaConsultaPaginadaConElPermisoAplicable() throws Exception {
        when(repositorioEventoAuditoria.buscarPagina(
                anyString(), anyString(), anyString(), anyString(),
                isNull(), isNull(), isNull(), any(Pageable.class))).thenReturn(Page.empty());

        clienteApi.perform(get("/api/v1/administracion/auditoria"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido").isArray());
    }
}
