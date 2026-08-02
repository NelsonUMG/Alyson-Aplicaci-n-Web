package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PoliticaContrasenaPruebas {

    private final PoliticaContrasena politica = new PoliticaContrasena(12);

    @Test
    void aceptaUnaContrasenaConLongitudValida() {
        assertThatCode(() -> politica.validar("Frase larga 2026")).doesNotThrowAnyException();
    }

    @Test
    void rechazaUnaContrasenaCorta() {
        assertThatThrownBy(() -> politica.validar("corta"))
                .isInstanceOf(SolicitudInvalidaException.class);
    }

    @Test
    void rechazaUnaConfiguracionMinimaInsegura() {
        assertThatThrownBy(() -> new PoliticaContrasena(8))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("entre 12 y 128");
    }
}
