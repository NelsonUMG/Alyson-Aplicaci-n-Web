package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ValidadorDominioCorreoPruebas {
    @Test void aceptaDistintosProveedoresYDominiosPublicosConDestinoDeCorreo() {
        var validador = conDestinoCorreo(true);
        assertThatCode(() -> validador.validar("persona@gmail.com")).doesNotThrowAnyException();
        assertThatCode(() -> validador.validar("persona@hotmail.com")).doesNotThrowAnyException();
        assertThatCode(() -> validador.validar("persona@institucion.com.gt")).doesNotThrowAnyException();
    }

    @Test void rechazaDominiosSinExtensionOSinDestinoDeCorreo() {
        var validador = conDestinoCorreo(true);
        assertThatThrownBy(() -> validador.validar("persona@localhost"))
                .isInstanceOf(SolicitudInvalidaException.class);
        assertThatThrownBy(() -> validador.validar("persona@-dominio.com"))
                .isInstanceOf(SolicitudInvalidaException.class);
        assertThatThrownBy(() -> conDestinoCorreo(false).validar("persona@dominio-inexistente.com"))
                .isInstanceOf(SolicitudInvalidaException.class);
    }

    private ValidadorDominioCorreo conDestinoCorreo(boolean existe) {
        return new ValidadorDominioCorreo() {
            @Override boolean tieneDestinoCorreo(String dominio) { return existe; }
        };
    }
}
