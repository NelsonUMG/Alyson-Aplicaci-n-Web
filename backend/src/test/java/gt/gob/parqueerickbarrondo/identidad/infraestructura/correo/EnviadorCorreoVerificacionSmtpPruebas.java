package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

import javax.imageio.ImageIO;

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
                .contains("Confirma tu correo presionando el botón")
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
    void rechazaUnDominioDeCloudflareNoConfigurado() throws Exception {
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
                .contains("http://localhost/verificar-correo?token=token-seguro")
                .doesNotContain("https://parque-prueba.trycloudflare.com/verificar-correo");
    }

    @Test
    void conservaElDominioCloudflareCuandoEsElConfigurado() throws Exception {
        var solicitud = new MockHttpServletRequest();
        solicitud.addHeader("Origin", "https://parque-prueba.trycloudflare.com");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(solicitud));
        var enviador = mock(JavaMailSender.class);
        var mensaje = new MimeMessage(Session.getInstance(new Properties()));
        when(enviador.createMimeMessage()).thenReturn(mensaje);
        var servicio = new EnviadorCorreoVerificacionSmtp(
                enviador,
                "notific.parqueerickbarrondo@gmail.com",
                "https://parque-prueba.trycloudflare.com",
                24);

        servicio.enviar("persona@example.com", "Persona", "token-seguro");

        assertThat(extraerTexto(mensaje))
                .contains("https://parque-prueba.trycloudflare.com/verificar-correo?token=token-seguro");
    }

    @Test
    void conservaHtmlTextoPlanoYEmblemaInlineAlSerializarElCorreo() throws Exception {
        var enviador = mock(JavaMailSender.class);
        var sesion = Session.getInstance(new Properties());
        var mensaje = new MimeMessage(sesion);
        when(enviador.createMimeMessage()).thenReturn(mensaje);
        var servicio = new EnviadorCorreoVerificacionSmtp(
                enviador, "notific.parqueerickbarrondo@gmail.com", "https://parque.example", 24);

        servicio.enviar("persona@example.com", "José <invitado>", "token-prueba");

        // Comprueba los bytes MIME que se transmiten, no solo la plantilla en memoria.
        mensaje.saveChanges();
        var salida = new ByteArrayOutputStream();
        mensaje.writeTo(salida);
        var recibido = new MimeMessage(sesion, new ByteArrayInputStream(salida.toByteArray()));
        assertThat(recibido.isMimeType("multipart/mixed")).isTrue();
        var raiz = (Multipart) recibido.getContent();
        assertThat(raiz.getCount()).isEqualTo(1);
        assertThat(raiz.getBodyPart(0).isMimeType("multipart/related")).isTrue();
        var relacionados = (Multipart) raiz.getBodyPart(0).getContent();
        assertThat(relacionados.getCount()).isEqualTo(2);
        assertThat(relacionados.getBodyPart(0).isMimeType("multipart/alternative")).isTrue();

        var partes = new ArrayList<Part>();
        recogerPartes(recibido, partes);
        assertThat(partes).hasSize(3);
        Part html = null;
        Part plano = null;
        Part imagen = null;
        for (var parte : partes) {
            if (parte.isMimeType("text/html")) html = parte;
            if (parte.isMimeType("text/plain")) plano = parte;
            if (parte.isMimeType("image/png")) imagen = parte;
        }
        assertThat(html).isNotNull();
        assertThat(plano).isNotNull();
        assertThat(imagen).isNotNull();
        assertThat(plano.getContent().toString())
                .contains("Hola José <invitado>")
                .doesNotContain("<!doctype html>", "<html", "<table");
        assertThat(html.getContent().toString())
                .contains("Hola, <strong>José &lt;invitado&gt;</strong>.")
                .contains("src=\"cid:emblema-parque\"")
                .doesNotContain("<strong>José <invitado>");
        assertThat(imagen.getHeader("Content-ID")).containsExactly("<emblema-parque>");
        assertThat(imagen.getDisposition()).isEqualTo(Part.INLINE);
        byte[] bytes;
        try (var entrada = imagen.getInputStream()) {
            bytes = entrada.readAllBytes();
        }
        try (var original = getClass().getResourceAsStream("/correo/imagenes/escudo-guatemala.png")) {
            assertThat(original).isNotNull();
            assertThat(bytes).isEqualTo(original.readAllBytes());
        }
        var emblema = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(emblema).isNotNull();
        assertThat(emblema.getWidth()).isGreaterThan(0);
        assertThat(emblema.getHeight()).isGreaterThan(0);
        verify(enviador).send(mensaje);
    }

    private void recogerPartes(Part parte, List<Part> partes) throws Exception {
        var contenido = parte.getContent();
        if (contenido instanceof Multipart multipart) {
            for (var indice = 0; indice < multipart.getCount(); indice++) {
                recogerPartes(multipart.getBodyPart(indice), partes);
            }
        }
        else {
            partes.add(parte);
        }
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
