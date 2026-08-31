package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Properties;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class EnviadorCorreoVerificacionSmtpPruebas {

    @AfterEach
    void limpiarSolicitud() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void muestraNoReplyComoNombreDelRemitente() throws Exception {
        var enviador = mock(JavaMailSender.class);
        var mensaje = new MimeMessage(Session.getInstance(new Properties()));
        when(enviador.createMimeMessage()).thenReturn(mensaje);
        var servicio = new EnviadorCorreoVerificacionSmtp(
                enviador,
                "notific.parqueerickbarrondo@gmail.com",
                "http://127.0.0.1:5173",
                24);

        servicio.enviar("persona@example.com", "Persona", "token-seguro");

        verify(enviador).send(mensaje);
        mensaje.saveChanges();
        var remitente = (InternetAddress) mensaje.getFrom()[0];
        assertThat(remitente.getPersonal()).isEqualTo("NoReply");
        assertThat(remitente.getAddress()).isEqualTo("notific.parqueerickbarrondo@gmail.com");
        assertThat(mensaje.getSubject()).isEqualTo("Finaliza la activación de tu cuenta");
        assertThat(extraerTexto(mensaje))
                .contains("Confirmación de correo")
                .contains("Hola, <strong>Persona</strong>.")
                .contains("Tu cuenta fue creada. Solo falta presionar el botón")
                .contains("Confirmar mi cuenta")
                .contains("Visita la página.")
                .contains("http://127.0.0.1:5173/verificar-correo?token=token-seguro")
                .doesNotContain("REGISTRO CASI LISTO")
                .doesNotContain("Confirma que este correo es tuyo")
                .doesNotContain("Al validar tu dirección podrás:")
                .doesNotContain("Entrar de forma segura al portal.")
                .doesNotContain("Participar en cursos y actividades.")
                .doesNotContain("Dar seguimiento a tus gestiones.");
    }

    @Test
    void usaElDominioDeCloudflareQueOriginoElRegistro() throws Exception {
        var solicitud = new MockHttpServletRequest();
        solicitud.addHeader("Origin", "https://parque-prueba.trycloudflare.com");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(solicitud));
        var enviador = mock(JavaMailSender.class);
        var mensaje = new MimeMessage(Session.getInstance(new Properties()));
        when(enviador.createMimeMessage()).thenReturn(mensaje);
        var servicio = new EnviadorCorreoVerificacionSmtp(
                enviador,
                "notific.parqueerickbarrondo@gmail.com",
                "http://127.0.0.1:5173",
                24);

        servicio.enviar("persona@example.com", "Persona", "token-seguro");

        assertThat(extraerTexto(mensaje))
                .contains("https://parque-prueba.trycloudflare.com/verificar-correo?token=token-seguro")
                .doesNotContain("http://127.0.0.1:5173/verificar-correo");
    }

    private String extraerTexto(Part parte) throws Exception {
        var contenido = parte.getContent();
        if (contenido instanceof Multipart multipart) {
            var texto = new StringBuilder();
            for (var indice = 0; indice < multipart.getCount(); indice++) {
                texto.append(extraerTexto(multipart.getBodyPart(indice)));
            }
            return texto.toString();
        }
        if (parte.isMimeType("text/*")) {
            return contenido.toString();
        }
        return "";
    }
}
