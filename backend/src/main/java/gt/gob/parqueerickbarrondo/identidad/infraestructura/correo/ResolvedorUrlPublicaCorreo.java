package gt.gob.parqueerickbarrondo.identidad.infraestructura.correo;

import java.net.URI;
import java.util.Locale;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

final class ResolvedorUrlPublicaCorreo {

    private ResolvedorUrlPublicaCorreo() {
    }

    static String resolver(String urlConfigurada) {
        var configurada = limpiar(urlConfigurada);
        var atributos = RequestContextHolder.getRequestAttributes();
        if (!(atributos instanceof ServletRequestAttributes servlet)) {
            return configurada;
        }
        var solicitud = servlet.getRequest();
        var origen = validarOrigen(solicitud.getHeader("Origin"), configurada);
        if (origen != null) {
            return origen;
        }
        var hostReenviado = primerValor(solicitud.getHeader("X-Forwarded-Host"));
        var protocoloReenviado = primerValor(solicitud.getHeader("X-Forwarded-Proto"));
        if (hostReenviado != null && protocoloReenviado != null) {
            var reenviada = validarOrigen(protocoloReenviado + "://" + hostReenviado, configurada);
            if (reenviada != null) {
                return reenviada;
            }
        }
        return origenLocalSolicitud(solicitud, configurada);
    }

    private static String origenLocalSolicitud(HttpServletRequest solicitud, String configurada) {
        var host = solicitud.getServerName();
        if (!esLocal(host)) {
            return configurada;
        }
        var puerto = solicitud.getServerPort();
        var puertoEstandar = ("http".equals(solicitud.getScheme()) && puerto == 80)
                || ("https".equals(solicitud.getScheme()) && puerto == 443);
        return solicitud.getScheme() + "://" + host + (puertoEstandar ? "" : ":" + puerto);
    }

    private static String validarOrigen(String candidato, String configurada) {
        if (candidato == null || candidato.isBlank()) {
            return null;
        }
        try {
            var uri = URI.create(candidato.strip());
            var configuradaUri = URI.create(configurada);
            var host = uri.getHost();
            if (host == null || uri.getUserInfo() != null
                    || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                return null;
            }
            var hostPermitido = host.equalsIgnoreCase(configuradaUri.getHost())
                    || esLocal(host)
                    || host.toLowerCase(Locale.ROOT).endsWith(".trycloudflare.com");
            if (!hostPermitido) {
                return null;
            }
            var puerto = uri.getPort();
            var puertoEstandar = puerto < 0
                    || ("http".equalsIgnoreCase(uri.getScheme()) && puerto == 80)
                    || ("https".equalsIgnoreCase(uri.getScheme()) && puerto == 443);
            return uri.getScheme().toLowerCase(Locale.ROOT)
                    + "://" + host
                    + (puertoEstandar ? "" : ":" + puerto);
        }
        catch (IllegalArgumentException excepcion) {
            return null;
        }
    }

    private static boolean esLocal(String host) {
        return "localhost".equalsIgnoreCase(host)
                || "127.0.0.1".equals(host)
                || "::1".equals(host);
    }

    private static String limpiar(String url) {
        return url.strip().replaceAll("/+$", "");
    }

    private static String primerValor(String encabezado) {
        if (encabezado == null || encabezado.isBlank()) {
            return null;
        }
        return encabezado.split(",", 2)[0].strip();
    }
}
