package gt.gob.parqueerickbarrondo.compartido.observabilidad;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltroCorrelacionSolicitudes extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest peticion,
            HttpServletResponse respuesta,
            FilterChain cadena) throws ServletException, IOException {
        var identificador = IdentificadorCorrelacion.normalizarOGenerar(
                peticion.getHeader(IdentificadorCorrelacion.ENCABEZADO));
        peticion.setAttribute(IdentificadorCorrelacion.ATRIBUTO, identificador);
        respuesta.setHeader(IdentificadorCorrelacion.ENCABEZADO, identificador);
        MDC.put(IdentificadorCorrelacion.CLAVE_REGISTRO, identificador);
        try {
            cadena.doFilter(peticion, respuesta);
        } finally {
            MDC.remove(IdentificadorCorrelacion.CLAVE_REGISTRO);
        }
    }
}
