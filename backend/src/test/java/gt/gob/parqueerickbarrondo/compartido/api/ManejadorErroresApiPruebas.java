package gt.gob.parqueerickbarrondo.compartido.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;

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
}
