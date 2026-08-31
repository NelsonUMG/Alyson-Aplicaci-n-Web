package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.correo;

import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.EnviadorCorreoResolucionSolicitud;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "false", matchIfMissing = true)
public class EnviadorCorreoResolucionLocal implements EnviadorCorreoResolucionSolicitud {
    private static final Logger REGISTRO = LoggerFactory.getLogger(EnviadorCorreoResolucionLocal.class);

    @Override
    public void enviar(String correo, String nombre, Long idSolicitud, String estado, String motivo) {
        REGISTRO.info("Correo local de resolución preparado para solicitud {} con estado {}", idSolicitud, estado);
    }
}
