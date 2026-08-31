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
                + motivo + "\n\nParque Erick Bernabé Barrondo García");
        correo.send(mensaje);
    }
}
