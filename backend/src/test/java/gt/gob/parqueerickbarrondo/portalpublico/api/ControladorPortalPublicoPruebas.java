package gt.gob.parqueerickbarrondo.portalpublico.api;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.compartido.configuracion.ConfiguracionSeguridad;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPublicacionPublica;
import gt.gob.parqueerickbarrondo.portalpublico.aplicacion.ServicioPortalPublico;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ServicioConsultaImagenPublica;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorPortalPublico.class)
@Import({ConfiguracionSeguridad.class, ManejadorErroresSeguridad.class})
class ControladorPortalPublicoPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private ServicioPortalPublico servicioPortalPublico;

    @MockitoBean
    private ServicioConsultaImagenPublica servicioConsultaImagen;

    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;

    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void permiteConsultarPublicacionesSinIniciarSesion() throws Exception {
        var respuesta = new RespuestaPaginaPublica<RespuestaPublicacionPublica>(List.of(), 0, 5, 0, 0);
        when(servicioPortalPublico.listarPublicaciones(anyString(), anyString(), isNull(), isNull(), eq(0), eq(5)))
                .thenReturn(respuesta);

        clienteApi.perform(get("/api/v1/publico/publicaciones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.contenido").isArray());
    }
}
