package gt.gob.parqueerickbarrondo.compartido.api;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class ManejadorErroresSeguridad {

    private final ObjectMapper conversorJson;

    public ManejadorErroresSeguridad(ObjectMapper conversorJson) {
        this.conversorJson = conversorJson;
    }

    public void responderAutenticacionRequerida(
            HttpServletRequest peticion,
            HttpServletResponse respuesta) throws IOException {
        escribirProblema(
                peticion,
                respuesta,
                HttpServletResponse.SC_UNAUTHORIZED,
                "AUTENTICACIONREQUERIDA",
                "Debes iniciar sesión para consultar este recurso.");
    }

    public void responderAccesoDenegado(
            HttpServletRequest peticion,
            HttpServletResponse respuesta) throws IOException {
        escribirProblema(
                peticion,
                respuesta,
                HttpServletResponse.SC_FORBIDDEN,
                "ACCESODENEGADO",
                "No tienes permiso para realizar esta operación.");
    }

    private void escribirProblema(
            HttpServletRequest peticion,
            HttpServletResponse respuesta,
            int estado,
            String codigo,
            String detalle) throws IOException {
        var problema = new ProblemaSeguridad(
                "Acceso rechazado",
                estado,
                detalle,
                codigo,
                peticion.getRequestURI(),
                IdentificadorCorrelacion.obtener(peticion));
        respuesta.setStatus(estado);
        respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
        respuesta.setContentType("application/problem+json");
        conversorJson.writeValue(respuesta.getWriter(), problema);
    }

    private record ProblemaSeguridad(
            String title,
            int status,
            String detail,
            String codigo,
            String ruta,
            String idCorrelacion) {
    }
}
