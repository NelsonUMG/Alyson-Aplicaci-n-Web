package gt.gob.parqueerickbarrondo.compartido.configuracion;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import gt.gob.parqueerickbarrondo.compartido.api.ManejadorErroresSeguridad;
import gt.gob.parqueerickbarrondo.identidad.api.ControladorAutenticacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAutenticacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ManejadorCierreSesion;
import gt.gob.parqueerickbarrondo.identidad.seguridad.ServicioDetallesUsuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.hamcrest.Matchers;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorAutenticacion.class)
@Import({ConfiguracionSeguridad.class, ManejadorErroresSeguridad.class})
class SeguridadApiPruebas {

    @Autowired
    private MockMvc clienteApi;

    @MockitoBean
    private ServicioRegistroCuenta servicioRegistroCuenta;

    @MockitoBean
    private ServicioAutenticacion servicioAutenticacion;

    @MockitoBean
    private ServicioDetallesUsuario servicioDetallesUsuario;

    @MockitoBean
    private ManejadorCierreSesion manejadorCierreSesion;

    @Test
    void rechazaElPerfilSinSesionConUnProblemaCompleto() throws Exception {
        clienteApi.perform(get("/api/v1/autenticacion/perfil"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.codigo").value("AUTENTICACIONREQUERIDA"))
                .andExpect(jsonPath("$.ruta").value("/api/v1/autenticacion/perfil"))
                .andExpect(jsonPath("$.idCorrelacion").isNotEmpty());
    }

    @Test
    void exigeCsrfAunqueElRegistroSeaPublico() throws Exception {
        clienteApi.perform(post("/api/v1/autenticacion/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(solicitudRegistroValida()))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.codigo").value("ACCESODENEGADO"))
                .andExpect(jsonPath("$.ruta").value("/api/v1/autenticacion/registro"))
                .andExpect(jsonPath("$.idCorrelacion").isNotEmpty());
    }

    @Test
    void aceptaElRegistroPublicoConCsrf() throws Exception {
        clienteApi.perform(post("/api/v1/autenticacion/registro")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(solicitudRegistroValida()))
                .andExpect(status().isAccepted())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void agregaEncabezadosDeNavegadorRestrictivos() throws Exception {
        clienteApi.perform(get("/api/v1/autenticacion/csrf").secure(true))
                .andExpect(header().string("Content-Security-Policy", Matchers.allOf(
                        Matchers.containsString("script-src 'self'"),
                        Matchers.containsString("frame-ancestors 'none'"))))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", Matchers.containsString("camera=()")))
                .andExpect(header().string("Strict-Transport-Security", Matchers.containsString("max-age=")));
    }

    private String solicitudRegistroValida() {
        return """
                {
                  "nombre": "Persona",
                  "apellido": "Prueba",
                  "correo": "persona@ejemplo.com",
                  "contrasena": "Contrasena larga de prueba",
                  "aceptaTerminos": true
                }
                """;
    }
}
