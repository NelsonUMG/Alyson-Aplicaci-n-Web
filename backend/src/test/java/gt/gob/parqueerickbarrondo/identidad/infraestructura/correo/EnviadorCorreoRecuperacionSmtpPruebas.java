package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Properties;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class EnviadorCorreoRecuperacionSmtpPruebas {
    @Test void enviaUnEnlaceDeUnaHoraConLaUrlConfiguradaYEscapaElNombre() throws Exception {
        var smtp = mock(JavaMailSender.class);
        var mensaje = new MimeMessage(Session.getInstance(new Properties()));
        when(smtp.createMimeMessage()).thenReturn(mensaje);
        new EnviadorCorreoRecuperacionSmtp(smtp, "noreply@example.com", "http://127.0.0.1:5173/")
                .enviar("persona@example.com", "<img src=x>", "token-seguro");
        verify(smtp).send(mensaje);
        assertThat(mensaje.getAllRecipients()[0].toString()).isEqualTo("persona@example.com");
        assertThat(texto(mensaje)).contains("1 hora", "solo puede usarse una vez",
                "http://127.0.0.1:5173/recuperar-contrasena?token=token-seguro", "&lt;img src=x&gt;");
    }
    private String texto(Part parte) throws Exception {
        var contenido = parte.getContent();
        if (contenido instanceof Multipart varias) {
            var texto = new StringBuilder();
            for (int i = 0; i < varias.getCount(); i++) texto.append(texto(varias.getBodyPart(i)));
            return texto.toString();
        }
        return parte.isMimeType("text/*") ? contenido.toString() : "";
    }
}
