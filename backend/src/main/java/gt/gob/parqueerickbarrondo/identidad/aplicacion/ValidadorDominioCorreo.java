package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.net.IDN;
import java.util.Hashtable;
import java.util.Locale;
import java.util.regex.Pattern;

import javax.naming.NamingException;
import javax.naming.directory.InitialDirContext;

import org.springframework.stereotype.Component;

@Component
public class ValidadorDominioCorreo {
    private static final Pattern DOMINIO_PUBLICO = Pattern.compile(
            "(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+"
                    + "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?");

    public void validar(String correo) {
        var separador = correo.lastIndexOf('@');
        if (separador < 1 || separador == correo.length() - 1)
            throw new SolicitudInvalidaException("Ingresa un correo electrónico con un dominio público válido.");

        final String dominio;
        try {
            dominio = IDN.toASCII(correo.substring(separador + 1), IDN.USE_STD3_ASCII_RULES)
                    .toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException error) {
            throw new SolicitudInvalidaException("Ingresa un correo electrónico con un dominio público válido.");
        }
        if (!DOMINIO_PUBLICO.matcher(dominio).matches() || !tieneDestinoCorreo(dominio))
            throw new SolicitudInvalidaException(
                    "No pudimos comprobar el dominio del correo. Revisa la dirección e inténtalo de nuevo.");
    }

    boolean tieneDestinoCorreo(String dominio) {
        var entorno = new Hashtable<String, String>();
        entorno.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
        entorno.put("com.sun.jndi.dns.timeout.initial", "1500");
        entorno.put("com.sun.jndi.dns.timeout.retries", "1");
        InitialDirContext dns = null;
        try {
            dns = new InitialDirContext(entorno);
            var mx = dns.getAttributes(dominio, new String[] {"MX"}).get("MX");
            if (mx != null && mx.size() > 0) {
                // MX 0 . indica expresamente que el dominio no recibe correo.
                return !(mx.size() == 1 && "0 .".equals(mx.get(0).toString().trim()));
            }
            if (dns.getAttributes(dominio, new String[] {"A"}).get("A") != null) return true;
            return dns.getAttributes(dominio, new String[] {"AAAA"}).get("AAAA") != null;
        } catch (NamingException error) {
            return false;
        } finally {
            if (dns != null) {
                try { dns.close(); } catch (NamingException ignorada) { }
            }
        }
    }
}
