package gt.gob.parqueerickbarrondo.identidad.seguridad;

import java.io.IOException;
import java.util.UUID;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class ManejadorCierreSesion implements LogoutSuccessHandler {

    private final ServicioAuditoria servicioAuditoria;

    public ManejadorCierreSesion(ServicioAuditoria servicioAuditoria) {
        this.servicioAuditoria = servicioAuditoria;
    }

    @Override
    public void onLogoutSuccess(
            HttpServletRequest peticion,
            HttpServletResponse respuesta,
            Authentication autenticacion) throws IOException {
        if (autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioSesion usuarioSesion) {
            servicioAuditoria.registrar(
                    usuarioSesion.obtenerIdUsuario(),
                    "CIERRESESION",
                    "SESION",
                    null,
                    "EXITOSO",
                    UUID.randomUUID().toString());
        }
        respuesta.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
