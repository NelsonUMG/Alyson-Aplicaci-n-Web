package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.util.Locale;

import org.springframework.stereotype.Component;

@Component
public class NormalizadorCorreo {

    public String normalizar(String correo) {
        return correo == null ? "" : correo.strip().toLowerCase(Locale.ROOT);
    }
}
