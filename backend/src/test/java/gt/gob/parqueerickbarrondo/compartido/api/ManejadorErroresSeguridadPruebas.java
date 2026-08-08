package gt.gob.parqueerickbarrondo.compartido.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

class ManejadorErroresSeguridadPruebas {

    private final JsonMapper conversorJson = JsonMapper.builder().build();
    private final ManejadorErroresSeguridad manejador = new ManejadorErroresSeguridad(conversorJson);

    @Test
    void respondeAutenticacionRequeridaConElContratoCompleto() throws Exception {
        var peticion = new MockHttpServletRequest("GET", "/api/v1/autenticacion/perfil");
        var respuesta = new MockHttpServletResponse();

        manejador.responderAutenticacionRequerida(peticion, respuesta);

        var problema = conversorJson.readTree(respuesta.getContentAsByteArray());
        assertThat(respuesta.getStatus()).isEqualTo(401);
        assertThat(respuesta.getContentType()).isEqualTo("application/problem+json;charset=UTF-8");
        assertThat(problema.get("title").asString()).isEqualTo("Acceso rechazado");
        assertThat(problema.get("status").asInt()).isEqualTo(401);
        assertThat(problema.get("codigo").asString()).isEqualTo("AUTENTICACIONREQUERIDA");
        assertThat(problema.get("ruta").asString()).isEqualTo("/api/v1/autenticacion/perfil");
        assertThat(UUID.fromString(problema.get("idCorrelacion").asString())).isNotNull();
    }

    @Test
    void respondeAccesoDenegadoConUnaCorrelacionNueva() throws Exception {
        var peticion = new MockHttpServletRequest("PUT", "/api/v1/administracion/usuarios/7/roles");
        var primeraRespuesta = new MockHttpServletResponse();
        var segundaRespuesta = new MockHttpServletResponse();

        manejador.responderAccesoDenegado(peticion, primeraRespuesta);
        manejador.responderAccesoDenegado(peticion, segundaRespuesta);

        var primerProblema = conversorJson.readTree(primeraRespuesta.getContentAsByteArray());
        var segundoProblema = conversorJson.readTree(segundaRespuesta.getContentAsByteArray());
        assertThat(primeraRespuesta.getStatus()).isEqualTo(403);
        assertThat(primerProblema.get("codigo").asString()).isEqualTo("ACCESODENEGADO");
        assertThat(primerProblema.get("ruta").asString())
                .isEqualTo("/api/v1/administracion/usuarios/7/roles");
        assertThat(primerProblema.get("idCorrelacion").asString())
                .isNotEqualTo(segundoProblema.get("idCorrelacion").asString());
    }
}
