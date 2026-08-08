package gt.gob.parqueerickbarrondo.portalpublico.api;

import java.util.List;
import java.time.LocalDate;

import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaAreaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaDetalleEvento;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaDetallePublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaEventoPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPublicacionPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaResumenBicicletas;
import gt.gob.parqueerickbarrondo.portalpublico.aplicacion.ServicioPortalPublico;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ServicioConsultaImagenPublica;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/publico")
public class ControladorPortalPublico {

    private final ServicioPortalPublico servicioPortalPublico;
    private final ServicioConsultaImagenPublica servicioConsultaImagen;

    public ControladorPortalPublico(
            ServicioPortalPublico servicioPortalPublico,
            ServicioConsultaImagenPublica servicioConsultaImagen) {
        this.servicioPortalPublico = servicioPortalPublico;
        this.servicioConsultaImagen = servicioConsultaImagen;
    }

    @GetMapping("/categorias-publicaciones")
    public List<RespuestaCategoriaPublicacion> listarCategoriasPublicacion() {
        return servicioPortalPublico.listarCategoriasPublicacion();
    }

    @GetMapping("/publicaciones")
    public RespuestaPaginaPublica<RespuestaPublicacionPublica> listarPublicaciones(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String categoria,
            @RequestParam(required = false) LocalDate fechaDesde,
            @RequestParam(required = false) LocalDate fechaHasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "5") int tamano) {
        return servicioPortalPublico.listarPublicaciones(
                busqueda, categoria, fechaDesde, fechaHasta, pagina, tamano);
    }

    @GetMapping("/publicaciones/{identificadorUrl}")
    public RespuestaDetallePublicacion consultarPublicacion(@PathVariable String identificadorUrl) {
        return servicioPortalPublico.consultarPublicacion(identificadorUrl);
    }

    @GetMapping("/eventos")
    public RespuestaPaginaPublica<RespuestaEventoPublico> listarEventos(
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano) {
        return servicioPortalPublico.listarEventos(pagina, tamano);
    }

    @GetMapping("/eventos/{identificadorUrl}")
    public RespuestaDetalleEvento consultarEvento(@PathVariable String identificadorUrl) {
        return servicioPortalPublico.consultarEvento(identificadorUrl);
    }

    @GetMapping("/areas")
    public List<RespuestaAreaPublica> listarAreas() {
        return servicioPortalPublico.listarAreas();
    }

    @GetMapping("/bicicletas/resumen")
    public RespuestaResumenBicicletas consultarResumenBicicletas() {
        return servicioPortalPublico.consultarResumenBicicletas();
    }

    @GetMapping("/imagenes-publicaciones/{idImagenPublicacion}")
    public ResponseEntity<Resource> consultarImagenPublicacion(@PathVariable Long idImagenPublicacion) {
        var imagen = servicioConsultaImagen.cargar(idImagenPublicacion);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(24)).cachePublic())
                .body(imagen.recurso());
    }
}
