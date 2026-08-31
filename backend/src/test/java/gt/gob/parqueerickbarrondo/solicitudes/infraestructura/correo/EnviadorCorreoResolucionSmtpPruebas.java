package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.correo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class EnviadorCorreoResolucionSmtpPruebas {

    @Test
    void informaLaDecisionYElMotivoAlSolicitante() {
        var correo = mock(JavaMailSender.class);
        var servicio = new EnviadorCorreoResolucionSmtp(
                correo, "notific.parqueerickbarrondo@gmail.com");

        servicio.enviar("persona@example.com", "Ana", 42L, "RECHAZADA",
                "El horario ya se encuentra reservado.");

        var captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(correo).send(captor.capture());
        var mensaje = captor.getValue();
        assertThat(mensaje.getTo()).containsExactly("persona@example.com");
        assertThat(mensaje.getSubject()).isEqualTo("Resolución de tu solicitud #42");
        assertThat(mensaje.getText())
                .contains("fue rechazada")
                .contains("El horario ya se encuentra reservado.");
    }
}
