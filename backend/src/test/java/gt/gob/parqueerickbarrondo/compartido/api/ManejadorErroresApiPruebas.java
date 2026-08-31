package gt.gob.parqueerickbarrondo.compartido.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;

class ManejadorErroresApiPruebas {

    private final ManejadorErroresApi manejador = new ManejadorErroresApi();

    @Test
    void noExponeElMensajeInternoDeSqlServerEnUnConflicto() {
        var peticion = new MockHttpServletRequest("POST", "/api/v1/administracion/recurso");
        var excepcion = new DataIntegrityViolationException(
                "Violation of UNIQUE KEY constraint con nombre interno y SQL sensible");

        var problema = manejador.manejarIntegridad(excepcion, peticion);

        assertThat(problema.getStatus()).isEqualTo(409);
        assertThat(problema.getDetail()).isEqualTo(
                "La operación entra en conflicto con datos existentes.");
        assertThat(problema.getDetail()).doesNotContain("UNIQUE KEY", "SQL");
    }

    @Test
    void noExponeLaExcepcionInternaYEntregaUnaReferenciaDeSoporte() {
        var peticion = new MockHttpServletRequest("POST", "/api/v1/administracion/recurso");
        var excepcion = new IllegalStateException("contraseña y detalle interno sensible");

        var problema = manejador.manejarErrorNoControlado(excepcion, peticion);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(problema.getDetail()).isEqualTo("No fue posible completar la solicitud.");
        assertThat(problema.getDetail()).doesNotContain("contraseña", "interno sensible");
        assertThat(problema.getProperties()).containsKeys("codigo", "ruta", "idCorrelacion");
    }

    @Test
    void clasificaLaBaseDeDatosNoDisponibleParaQueSoporteIdentifiqueLaCausa() {
        var peticion = new MockHttpServletRequest("GET", "/api/v1/recurso");

        var problema = manejador.manejarBaseDatosNoDisponible(
                new CannotGetJdbcConnectionException("detalle de conexión sensible"),
                peticion);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
        assertThat(problema.getProperties()).containsEntry("codigo", "BASEDEDATOSNODISPONIBLE");
        assertThat(problema.getDetail()).doesNotContain("detalle de conexión sensible");
    }

    @Test
    void explicaLaRutaElMetodoRechazadoYLosMetodosPermitidos() {
        var peticion = new MockHttpServletRequest(
                "GET", "/api/v1/administracion/solicitudes/catalogo/categorias");
        var excepcion = new HttpRequestMethodNotSupportedException("GET", java.util.List.of("POST"));

        var problema = manejador.manejarMetodoNoPermitido(excepcion, peticion);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED.value());
        assertThat(problema.getDetail()).contains(
                "/api/v1/administracion/solicitudes/catalogo/categorias", "GET", "POST");
        assertThat(problema.getProperties())
                .containsEntry("metodo", "GET")
                .containsEntry("metodosPermitidos", java.util.List.of("POST"));
    }
}
