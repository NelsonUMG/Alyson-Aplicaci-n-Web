package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.EnviadorCorreoVerificacion;
import jakarta.mail.MessagingException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailPreparationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "true")
public class EnviadorCorreoVerificacionSmtp implements EnviadorCorreoVerificacion {

    private static final String NOMBRE_REMITENTE = "NoReply";
    private static final String IDENTIFICADOR_EMBLEMA = "emblema-parque";
    private static final ClassPathResource EMBLEMA =
            new ClassPathResource("correo/imagenes/escudo-guatemala.png");

    private final JavaMailSender enviador;
    private final String remitente;
    private final String urlPublica;
    private final long duracionHoras;

    public EnviadorCorreoVerificacionSmtp(
            JavaMailSender enviador,
            @Value("${correo.verificacion.remitente}") String remitente,
            @Value("${correo.verificacion.url-publica}") String urlPublica,
            @Value("${correo.verificacion.duracion-horas:24}") long duracionHoras) {
        this.enviador = enviador;
        this.remitente = remitente;
        this.urlPublica = urlPublica.replaceAll("/+$", "");
        this.duracionHoras = duracionHoras;
    }

    @Override
    public void enviar(String correo, String nombre, String token) {
        var urlPublicaEfectiva = ResolvedorUrlPublicaCorreo.resolver(urlPublica);
        var enlace = urlPublicaEfectiva + "/verificar-correo?token=" + token;
        try {
            var mensaje = enviador.createMimeMessage();
            var contenido = new MimeMessageHelper(
                    mensaje,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            contenido.setFrom(remitente, NOMBRE_REMITENTE);
            contenido.setTo(correo);
            contenido.setSubject("Finaliza la activación de tu cuenta");
            contenido.setText(
                    crearTextoPlano(nombre, enlace, urlPublicaEfectiva),
                    crearHtml(nombre, enlace, urlPublicaEfectiva));
            contenido.addInline(IDENTIFICADOR_EMBLEMA, EMBLEMA, "image/png");
            enviador.send(mensaje);
        }
        catch (MessagingException | UnsupportedEncodingException error) {
            throw new MailPreparationException("No fue posible preparar el correo de verificación.", error);
        }
    }

    private String crearTextoPlano(String nombre, String enlace, String urlPublicaEfectiva) {
        return "Hola " + nombre + ",\n\n"
                + "Tu cuenta fue creada. Solo falta presionar el botón \"Confirmar mi cuenta\" "
                + "para activar tu cuenta del Parque Erick Barrondo.\n\n"
                + "Confirmar mi cuenta:\n"
                + enlace + "\n\n"
                + "Tienes " + duracionHoras + " horas para completar la activación.\n"
                + "Visita la página: " + urlPublicaEfectiva + "\n\n"
                + "Si no reconoces este registro, no necesitas realizar ninguna acción.";
    }

    private String crearHtml(String nombre, String enlace, String urlPublicaEfectiva) {
        var nombreSeguro = HtmlUtils.htmlEscape(nombre, StandardCharsets.UTF_8.name());
        var enlaceSeguro = HtmlUtils.htmlEscape(enlace, StandardCharsets.UTF_8.name());
        var urlPublicaSegura = HtmlUtils.htmlEscape(urlPublicaEfectiva, StandardCharsets.UTF_8.name());
        return """
                <!doctype html>
                <html lang="es">
                  <body style="margin:0;padding:0;background:#f2f0e9;font-family:Arial,Helvetica,sans-serif;color:#17352c;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f0e9;padding:32px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border-collapse:separate;border-spacing:0;border-radius:16px;box-shadow:0 8px 28px rgba(25,53,44,.08);overflow:hidden;">
                            <tr>
                              <td style="height:7px;background:#d8a927;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                            <tr>
                              <td style="padding:22px 34px;background:#ffffff;border-bottom:1px solid #e7ece9;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td width="58" valign="middle">
                                      <img src="cid:emblema-parque" width="50" height="50" alt="Emblema del Parque Erick Barrondo" style="display:block;width:50px;height:50px;border:0;">
                                    </td>
                                    <td valign="middle" style="padding-left:13px;">
                                      <div style="font-size:19px;line-height:1.25;font-weight:700;color:#103c31;">Parque Erick Barrondo</div>
                                      <div style="margin-top:3px;font-size:11px;line-height:1.4;color:#6a7c75;">Portal de servicios y actividades</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:38px 42px 34px;background:#0d493b;">
                                <h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#ffffff;">Confirmación de correo</h1>
                                <p style="margin:0 0 10px;font-size:16px;line-height:1.6;color:#ffffff;">Hola, <strong>{{NOMBRE}}</strong>.</p>
                                <p style="max-width:510px;margin:0;font-size:15px;line-height:1.7;color:#d6e7e1;">Tu cuenta fue creada. Solo falta presionar el botón <strong>“Confirmar mi cuenta”</strong> para activar tu cuenta del Parque Erick Barrondo.</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:30px 42px 16px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td align="center" bgcolor="#d8a927" style="border-radius:8px;">
                                      <a href="{{ENLACE}}" style="display:inline-block;padding:14px 24px;color:#16372e;font-size:15px;font-weight:700;text-decoration:none;">Confirmar mi cuenta</a>
                                    </td>
                                  </tr>
                                </table>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;width:100%;">
                                  <tr>
                                    <td width="32" valign="top" style="font-size:20px;line-height:1;color:#0d765e;">&#9719;</td>
                                    <td valign="top" style="font-size:12px;line-height:1.6;color:#65776f;">Este enlace permanecerá disponible durante <strong>{{HORAS}} horas</strong>. Después de ese plazo será necesario solicitar uno nuevo.</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 42px 30px;">
                                <a href="{{URL_PUBLICA}}" style="font-size:13px;line-height:1.5;font-weight:700;color:#0a725d;text-decoration:underline;">Visita la página.</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:20px 42px 24px;background:#eef3f0;border-top:1px solid #e1e8e4;">
                                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#60736c;"><strong>¿No solicitaste este registro?</strong> No realices ninguna acción; tu correo no será validado.</p>
                                <p style="margin:0;font-size:11px;line-height:1.5;color:#87958f;">Mensaje automático del Parque Erick Barrondo · Ciudad de Guatemala</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """
                .replace("{{HORAS}}", Long.toString(duracionHoras))
                .replace("{{URL_PUBLICA}}", urlPublicaSegura)
                .replace("{{ENLACE}}", enlaceSeguro)
                .replace("{{NOMBRE}}", nombreSeguro);
    }
}
