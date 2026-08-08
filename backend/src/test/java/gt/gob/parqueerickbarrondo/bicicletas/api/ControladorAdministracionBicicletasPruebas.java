package gt.gob.parqueerickbarrondo.bicicletas.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import gt.gob.parqueerickbarrondo.bicicletas.aplicacion.ServicioAdministracionBicicletas;
import gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia.RepositorioHistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia.RepositorioPrestamoBicicleta;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresApi;
import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioBicicleta;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorAdministracionBicicletas.class)
@Import({
    ConfiguracionSeguridad.class,
    ManejadorErroresSeguridad.class,
    ManejadorErroresApi.class,
    ServicioAdministracionBicicletas.class
})
class ControladorAdministracionBicicletasPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private RepositorioBicicleta repositorioBicicleta;
    @MockitoBean
    private RepositorioHistorialEstadoBicicleta repositorioHistorial;
    @MockitoBean
    private RepositorioPrestamoBicicleta repositorioPrestamo;
    @MockitoBean
    private RepositorioUsuario repositorioUsuario;
    @MockitoBean
    private ServicioIdempotencia servicioIdempotencia;
    @MockitoBean
    private ServicioAuditoria servicioAuditoria;
    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;
    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void exigeSesionParaConsultarElInventario() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/bicicletas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "EVENTOLEER")
    void rechazaUnaSesionSinPermisoDeBicicletas() throws Exception {
        clienteApi.perform(get("/api/v1/administracion/bicicletas"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"));
    }

    @Test
    @WithMockUser(authorities = "BICICLETALEER")
    void permiteConsultarElInventarioConElPermisoAplicable() throws Exception {
        when(repositorioBicicleta.buscarAdministradas(
                eq(""), eq(""), any(Pageable.class))).thenReturn(Page.empty());

        clienteApi.perform(get("/api/v1/administracion/bicicletas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido").isArray());
    }
}
