package gt.gob.parqueerickbarrondo.eventos.api;

import java.time.Duration;

import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioConsultaImagenEventoPublica;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/publico/eventos")
public class ControladorImagenEventoPublica {

    private final ServicioConsultaImagenEventoPublica servicioConsulta;

    public ControladorImagenEventoPublica(ServicioConsultaImagenEventoPublica servicioConsulta) {
        this.servicioConsulta = servicioConsulta;
    }

    @GetMapping("/{identificadorUrl}/imagen")
    public ResponseEntity<Resource> consultar(@PathVariable String identificadorUrl) {
        var imagen = servicioConsulta.cargar(identificadorUrl);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofHours(24)).cachePublic())
                .body(imagen.recurso());
    }
}
