package gt.gob.parqueerickbarrondo.compartido.observabilidad;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;

public final class IdentificadorCorrelacion {

    public static final String ENCABEZADO = "X-Correlation-ID";
    public static final String ATRIBUTO = IdentificadorCorrelacion.class.getName();
    public static final String CLAVE_REGISTRO = "idCorrelacion";

    private IdentificadorCorrelacion() {
    }

    public static String nuevo() {
        return UUID.randomUUID().toString();
    }

    public static String normalizarOGenerar(String valorRecibido) {
        if (valorRecibido != null) {
            try {
                return UUID.fromString(valorRecibido.strip()).toString();
            } catch (IllegalArgumentException excepcion) {
                // Un valor externo inválido no se propaga a encabezados, logs ni auditoría.
            }
        }
        return nuevo();
    }

    public static String obtener(HttpServletRequest peticion) {
        var valor = peticion.getAttribute(ATRIBUTO);
        return valor instanceof String identificador && !identificador.isBlank()
                ? identificador
                : actual();
    }

    public static String actual() {
        var valor = MDC.get(CLAVE_REGISTRO);
        return valor == null || valor.isBlank() ? nuevo() : valor;
    }
}
