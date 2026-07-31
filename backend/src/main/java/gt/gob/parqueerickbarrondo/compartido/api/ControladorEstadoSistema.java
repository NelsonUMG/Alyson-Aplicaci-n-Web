package gt.gob.parqueerickbarrondo.compartido.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sistema")
public class ControladorEstadoSistema {

    @GetMapping("/estado")
    public RespuestaEstadoSistema consultarEstado() {
        return new RespuestaEstadoSistema("DISPONIBLE", "api-parque-erick-barrondo", "v1");
    }

    public record RespuestaEstadoSistema(String estado, String servicio, String versionApi) {
    }
}
