package gt.gob.parqueerickbarrondo.apariencia;

import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ControladorApariencia {
    private final ServicioApariencia servicio;
    public ControladorApariencia(ServicioApariencia servicio) { this.servicio = servicio; }

    @GetMapping("/api/v1/publico/apariencia")
    public ResponseEntity<Apariencia> consultar() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(servicio.consultar());
    }

    @GetMapping("/api/v1/publico/apariencia/portada")
    public ResponseEntity<Resource> portada() {
        var archivo = servicio.portada();
        return ResponseEntity.ok().cacheControl(CacheControl.noCache())
                .contentType(MediaType.parseMediaType(archivo.tipoMedio()))
                .contentLength(archivo.tamanoBytes()).body(archivo.recurso());
    }

    @PutMapping(value = "/api/v1/administracion/apariencia", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Apariencia guardar(@Valid @RequestPart("configuracion") Apariencia.Cambio cambio,
            @RequestPart(value = "imagen", required = false) MultipartFile imagen,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicio.guardar(cambio, imagen, actor);
    }
}
