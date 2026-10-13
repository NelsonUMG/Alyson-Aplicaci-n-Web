package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.EnviadorCorreoVerificacion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "false", matchIfMissing = true)
public class EnviadorCorreoVerificacionLocal implements EnviadorCorreoVerificacion {

    private static final Logger REGISTRO = LoggerFactory.getLogger(EnviadorCorreoVerificacionLocal.class);
    @Override
    public boolean habilitado() { return false; }

    @Override
    public void enviar(String correo, String nombre, String token) {
        REGISTRO.warn("No se envía verificación para {} porque SMTP está deshabilitado.", correo);
    }
}
