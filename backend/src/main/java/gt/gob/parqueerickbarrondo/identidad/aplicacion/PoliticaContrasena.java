package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PoliticaContrasena {

    private final int longitudMinima;

    public PoliticaContrasena(@Value("${seguridad.contrasena.longitud-minima}") int longitudMinima) {
        if (longitudMinima < 12 || longitudMinima > 128) {
            throw new IllegalStateException(
                    "SEGURIDADLONGITUDMINIMACONTRASENA debe estar entre 12 y 128 caracteres.");
        }
        this.longitudMinima = longitudMinima;
    }

    public void validar(String contrasena) {
        if (contrasena == null || contrasena.length() < longitudMinima || contrasena.length() > 128) {
            throw new SolicitudInvalidaException(
                    "La contraseña debe tener entre " + longitudMinima + " y 128 caracteres.");
        }
    }

    public int obtenerLongitudMinima() {
        return longitudMinima;
    }
}
