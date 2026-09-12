package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MensajesAccesoPruebas {

    @Test
    void presentaMensajesClarosParaLosErroresDeAcceso() {
        assertThat(new CredencialesInvalidasException().getMessage())
                .isEqualTo("La contraseña es incorrecta. Vuelve a intentarlo.");
        assertThat(new CredencialesInvalidasException("El correo no existe.").getMessage())
                .isEqualTo("El correo no existe.");
        assertThat(new DemasiadosIntentosException().getMessage())
                .isEqualTo("Alcanzaste el límite de 5 intentos. Espera 10 minutos antes de volver a intentarlo.");
    }
}
