package gt.gob.parqueerickbarrondo.areas.api;

import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioConsultaImagenAreaPublica;
import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioMapaPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaMapaPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaRutaMapa;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/publico")
public class ControladorMapaPublico {

    private final ServicioMapaPublico servicioMapa;
    private final ServicioConsultaImagenAreaPublica servicioImagen;

    public ControladorMapaPublico(
            ServicioMapaPublico servicioMapa,
            ServicioConsultaImagenAreaPublica servicioImagen) {
        this.servicioMapa = servicioMapa;
        this.servicioImagen = servicioImagen;
    }

    @GetMapping("/mapa")
    public RespuestaMapaPublico consultarMapa() {
        return servicioMapa.consultarMapa();
    }

    @GetMapping("/mapa/ruta")
    public RespuestaRutaMapa calcularRuta(
            @RequestParam Long origen,
            @RequestParam Long destino,
            @RequestParam(defaultValue = "false") boolean accesible) {
        return servicioMapa.calcularRuta(origen, destino, accesible);
    }

    @GetMapping("/areas/{codigo}/imagen")
    public ResponseEntity<Resource> consultarImagenArea(@PathVariable String codigo) {
        var imagen = servicioImagen.cargar(codigo);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(24)).cachePublic())
                .body(imagen.recurso());
    }
}
