package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ServicioAutenticacionSesionPruebas {

    @Test
    void configuraUnaSesionPersistenteDuranteSieteDias() {
        var peticion = new MockHttpServletRequest();
        var respuesta = new MockHttpServletResponse();
        var sesion = peticion.getSession(true);

        ServicioAutenticacion.configurarSesionExtendida(sesion, peticion, respuesta);

        assertThat(sesion.getMaxInactiveInterval())
                .isEqualTo(ServicioAutenticacion.DURACION_SESION_EXTENDIDA_SEGUNDOS);
        var cookie = respuesta.getCookie("JSESSIONID");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo(sesion.getId());
        assertThat(cookie.getMaxAge()).isEqualTo(7 * 24 * 60 * 60);
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
    }
}
