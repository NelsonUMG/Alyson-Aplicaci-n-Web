package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.EnviadorCorreoVerificacion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "correo.verificacion.envio-habilitado", havingValue = "false", matchIfMissing = true)
public class EnviadorCorreoVerificacionLocal implements EnviadorCorreoVerificacion {

    private static final Logger REGISTRO = LoggerFactory.getLogger(EnviadorCorreoVerificacionLocal.class);
    private final String urlPublica;

    public EnviadorCorreoVerificacionLocal(@Value("${correo.verificacion.url-publica}") String urlPublica) {
        this.urlPublica = urlPublica.replaceAll("/+$", "");
    }

    @Override
    public void enviar(String correo, String nombre, String token) {
        REGISTRO.info(
                "Envío de correo deshabilitado. Enlace local de verificación para {}: {}/verificar-correo?token={}",
                correo,
                urlPublica,
                token);
    }
}
