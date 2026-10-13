package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.correo;

import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.EnviadorCorreoResolucionSolicitud;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "true")
public class EnviadorCorreoResolucionSmtp implements EnviadorCorreoResolucionSolicitud {

    private final JavaMailSender correo;
    private final String remitente;
    @Value("${correo.verificacion.url-publica:http://127.0.0.1:5173}")
    private String urlPublica = "http://127.0.0.1:5173";

    public EnviadorCorreoResolucionSmtp(JavaMailSender correo,
            @Value("${correo.verificacion.remitente}") String remitente) {
        this.correo = correo;
        this.remitente = remitente;
    }

    @Override
    public void enviar(String destinatario, String nombre, Long idSolicitud, String estado, String motivo) {
        var mensaje = new SimpleMailMessage();
        mensaje.setFrom(remitente);
        mensaje.setTo(destinatario);
        mensaje.setSubject("Resolución de tu solicitud #" + idSolicitud);
        mensaje.setText("Hola " + nombre + ",\n\nTu solicitud #" + idSolicitud + " fue "
                + ("APROBADA".equals(estado) ? "aprobada" : "rechazada") + ".\n\nMotivo o respuesta:\n"
                + motivo + "\n\nConsulta el detalle" + ("APROBADA".equals(estado) ? " y descarga o imprime tu comprobante PDF" : "")
                + " en Mis solicitudes: " + urlPublica.replaceAll("/+$", "") + "/mis-solicitudes"
                + "\n\nParque Erick Bernabé Barrondo García");
        correo.send(mensaje);
    }
}
