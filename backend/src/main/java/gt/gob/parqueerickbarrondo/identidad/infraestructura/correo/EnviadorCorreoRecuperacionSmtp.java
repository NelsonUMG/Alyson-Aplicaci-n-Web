package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.EnviadorCorreoRecuperacion;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "true")
public class EnviadorCorreoRecuperacionSmtp implements EnviadorCorreoRecuperacion {
    private final JavaMailSender enviador;
    private final String remitente;
    private final String urlPublica;

    public EnviadorCorreoRecuperacionSmtp(JavaMailSender enviador,
            @Value("${correo.verificacion.remitente}") String remitente,
            @Value("${correo.verificacion.url-publica}") String urlPublica) {
        this.enviador = enviador; this.remitente = remitente;
        this.urlPublica = urlPublica.replaceAll("/+$", "");
    }

    @Override
    public void enviar(String correo, String nombre, String token) {
        // Se usa exclusivamente la URL configurada, nunca los encabezados del solicitante.
        var enlace = urlPublica + "/recuperar-contrasena?token=" + token;
        try {
            var mensaje = enviador.createMimeMessage();
            var contenido = new MimeMessageHelper(mensaje, true, "UTF-8");
            contenido.setFrom(remitente);
            contenido.setTo(correo);
            contenido.setSubject("Recupera tu contraseña · Parque Erick Barrondo");
            contenido.setText("Hola " + nombre + ".\n\nPara cambiar tu contraseña, abre este enlace:\n"
                    + enlace + "\n\nEl enlace vence en 1 hora y solo puede usarse una vez. "
                    + "Si no solicitaste el cambio, ignora este correo. Tu contraseña seguirá igual.",
                    """
                    <html lang="es"><body style="margin:0;background:#f4f6f4;font-family:Arial,sans-serif;color:#173b2d">
                    <div style="max-width:560px;margin:32px auto;padding:32px;background:white;border-top:6px solid #d8a927">
                    <p style="font-weight:bold">Parque Erick Barrondo</p><h1 style="font-size:26px">Recupera tu contraseña</h1>
                    <p>Hola, %s.</p><p>Recibimos una solicitud para cambiar tu contraseña.</p>
                    <p style="margin:28px 0"><a style="display:inline-block;background:#173b2d;color:white;padding:14px 22px;text-decoration:none" href="%s">Crear nueva contraseña</a></p>
                    <p>Este enlace vence en <strong>1 hora</strong> y solo puede usarse una vez.</p>
                    <p>Si no solicitaste este cambio, ignora el correo. Tu contraseña seguirá igual.</p>
                    </div></body></html>
                    """.formatted(HtmlUtils.htmlEscape(nombre), HtmlUtils.htmlEscape(enlace)));
            enviador.send(mensaje);
        } catch (MessagingException error) {
            throw new MailPreparationException("No fue posible preparar el correo de recuperación.", error);
        }
    }
}
