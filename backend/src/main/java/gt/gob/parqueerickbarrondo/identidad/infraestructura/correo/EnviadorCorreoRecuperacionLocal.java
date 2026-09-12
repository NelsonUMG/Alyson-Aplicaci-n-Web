package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.EnviadorCorreoRecuperacion;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "false", matchIfMissing = true)
public class EnviadorCorreoRecuperacionLocal implements EnviadorCorreoRecuperacion {
    @Override
    public void enviar(String correo, String nombre, String token) {
        // No publicar credenciales de recuperación en los registros de la aplicación.
        throw new IllegalStateException("El envío SMTP está deshabilitado.");
    }
}
