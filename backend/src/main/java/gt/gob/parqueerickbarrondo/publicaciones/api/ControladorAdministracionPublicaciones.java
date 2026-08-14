package gt.gob.parqueerickbarrondo.publicaciones.api;

import java.util.List;

import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaCategoriaAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaImagenAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaPublicacionAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudVersionCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudVersionPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ServicioAdministracionPublicaciones;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/administracion")
@Validated
public class ControladorAdministracionPublicaciones {

    private final ServicioAdministracionPublicaciones servicioAdministracion;

    public ControladorAdministracionPublicaciones(ServicioAdministracionPublicaciones servicioAdministracion) {
        this.servicioAdministracion = servicioAdministracion;
    }

    @GetMapping("/categorias-publicaciones")
    public List<RespuestaCategoriaAdministrada> listarCategorias() {
        return servicioAdministracion.listarCategorias();
    }

    @PostMapping("/categorias-publicaciones")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaCategoriaAdministrada crearCategoria(
            @Valid @RequestBody SolicitudCategoriaPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearCategoria(solicitud, actor);
    }

    @PutMapping("/categorias-publicaciones/{idCategoria}")
    public RespuestaCategoriaAdministrada actualizarCategoria(
            @PathVariable Long idCategoria,
            @Valid @RequestBody SolicitudCategoriaPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarCategoria(idCategoria, solicitud, actor);
    }

    @DeleteMapping("/categorias-publicaciones/{idCategoria}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarCategoria(
            @PathVariable Long idCategoria,
            @Valid @RequestBody SolicitudVersionCategoriaPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        servicioAdministracion.eliminarCategoria(idCategoria, solicitud.version(), actor);
    }

    @GetMapping("/publicaciones")
    public RespuestaPaginaPublica<RespuestaPublicacionAdministrada> listarPublicaciones(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(required = false) Long idCategoria,
            @RequestParam(defaultValue = "ACTUALIZACION") String orden,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioAdministracion.listarPublicaciones(
                busqueda, estado, idCategoria, orden, pagina, tamano);
    }

    @GetMapping("/publicaciones/{idPublicacion}")
    public RespuestaPublicacionAdministrada consultarPublicacion(@PathVariable Long idPublicacion) {
        return servicioAdministracion.consultarPublicacion(idPublicacion);
    }

    @GetMapping("/publicaciones/{idPublicacion}/imagenes")
    public List<RespuestaImagenAdministrada> listarImagenes(@PathVariable Long idPublicacion) {
        return servicioAdministracion.listarImagenes(idPublicacion);
    }

    @GetMapping("/publicaciones/{idPublicacion}/imagenes/{idImagen}/archivo")
    public ResponseEntity<Resource> consultarImagen(
            @PathVariable Long idPublicacion,
            @PathVariable Long idImagen) {
        var imagen = servicioAdministracion.cargarImagen(idPublicacion, idImagen);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.noCache().cachePrivate())
                .body(imagen.recurso());
    }

    @PostMapping("/publicaciones")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaPublicacionAdministrada crearPublicacion(
            @Valid @RequestBody SolicitudPublicacion solicitud,
            @RequestHeader(value = "Idempotency-Key", required = false) String claveIdempotencia,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearPublicacion(solicitud, claveIdempotencia, actor);
    }

    @PutMapping("/publicaciones/{idPublicacion}")
    public RespuestaPublicacionAdministrada actualizarPublicacion(
            @PathVariable Long idPublicacion,
            @Valid @RequestBody SolicitudPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarPublicacion(idPublicacion, solicitud, actor);
    }

    @PostMapping("/publicaciones/{idPublicacion}/publicar")
    public RespuestaPublicacionAdministrada publicar(
            @PathVariable Long idPublicacion,
            @Valid @RequestBody SolicitudVersionPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.publicar(idPublicacion, solicitud.version(), actor);
    }

    @PostMapping("/publicaciones/{idPublicacion}/archivar")
    public RespuestaPublicacionAdministrada archivar(
            @PathVariable Long idPublicacion,
            @Valid @RequestBody SolicitudVersionPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.archivar(idPublicacion, solicitud.version(), actor);
    }

    @PostMapping("/publicaciones/{idPublicacion}/desarchivar")
    public RespuestaPublicacionAdministrada desarchivar(
            @PathVariable Long idPublicacion,
            @Valid @RequestBody SolicitudVersionPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.desarchivar(idPublicacion, solicitud.version(), actor);
    }

    @DeleteMapping("/publicaciones/{idPublicacion}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarPublicacion(
            @PathVariable Long idPublicacion,
            @Valid @RequestBody SolicitudVersionPublicacion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        servicioAdministracion.eliminarPublicacion(idPublicacion, solicitud.version(), actor);
    }

    @PostMapping(
            value = "/publicaciones/{idPublicacion}/imagenes",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaImagenAdministrada agregarImagen(
            @PathVariable Long idPublicacion,
            @RequestParam MultipartFile archivo,
            @RequestParam
            @NotBlank(message = "El texto alternativo es obligatorio.")
            @Size(max = 255, message = "El texto alternativo no puede superar 255 caracteres.")
            String textoAlternativo,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.agregarImagen(idPublicacion, archivo, textoAlternativo, actor);
    }

    @DeleteMapping("/publicaciones/{idPublicacion}/imagenes/{idImagen}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarImagen(
            @PathVariable Long idPublicacion,
            @PathVariable Long idImagen,
            @AuthenticationPrincipal UsuarioSesion actor) {
        servicioAdministracion.eliminarImagen(idPublicacion, idImagen, actor);
    }
}
