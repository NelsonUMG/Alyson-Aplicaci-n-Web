package gt.gob.parqueerickbarrondo.compartido.observabilidad;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class FiltroCorrelacionSolicitudesPruebas {

    private final FiltroCorrelacionSolicitudes filtro = new FiltroCorrelacionSolicitudes();

    @Test
    void conservaUnUuidValidoEnLaPeticionYLaRespuesta() throws Exception {
        var identificador = UUID.randomUUID().toString();
        var peticion = new MockHttpServletRequest();
        peticion.addHeader(IdentificadorCorrelacion.ENCABEZADO, identificador);
        var respuesta = new MockHttpServletResponse();

        filtro.doFilter(peticion, respuesta, new MockFilterChain());

        assertThat(peticion.getAttribute(IdentificadorCorrelacion.ATRIBUTO)).isEqualTo(identificador);
        assertThat(respuesta.getHeader(IdentificadorCorrelacion.ENCABEZADO)).isEqualTo(identificador);
    }

    @Test
    void reemplazaUnValorExternoInvalidoPorUnUuidSeguro() throws Exception {
        var peticion = new MockHttpServletRequest();
        peticion.addHeader(IdentificadorCorrelacion.ENCABEZADO, "valor\r\ninseguro");
        var respuesta = new MockHttpServletResponse();

        filtro.doFilter(peticion, respuesta, new MockFilterChain());

        assertThat(UUID.fromString(respuesta.getHeader(IdentificadorCorrelacion.ENCABEZADO)))
                .isNotNull();
    }
}
