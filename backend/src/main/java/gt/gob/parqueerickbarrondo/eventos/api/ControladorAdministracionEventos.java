package gt.gob.parqueerickbarrondo.eventos.api;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaEventoAdministrado;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaInscripcionAdministrada;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaImagenEventoAdministrada;
import java.util.List;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudEvento;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudVersionEvento;
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioAdministracionEventos;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/administracion/eventos")
@Validated
public class ControladorAdministracionEventos {

    private final ServicioAdministracionEventos servicioAdministracion;

    public ControladorAdministracionEventos(ServicioAdministracionEventos servicioAdministracion) {
        this.servicioAdministracion = servicioAdministracion;
    }

    @GetMapping
    public RespuestaPaginaPublica<RespuestaEventoAdministrado> listar(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(defaultValue = "ACTUALIZACION") String orden,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioAdministracion.listar(busqueda, estado, orden, pagina, tamano);
    }

    @GetMapping("/{idEvento}")
    public RespuestaEventoAdministrado consultar(@PathVariable Long idEvento) {
        return servicioAdministracion.consultar(idEvento);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaEventoAdministrado crear(
            @Valid @RequestBody SolicitudEvento solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crear(solicitud, actor);
    }

    @PutMapping("/{idEvento}")
    public RespuestaEventoAdministrado actualizar(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudEvento solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizar(idEvento, solicitud, actor);
    }

    @PostMapping("/{idEvento}/publicar")
    public RespuestaEventoAdministrado publicar(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudVersionEvento solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.publicar(idEvento, solicitud.version(), actor);
    }

    @PostMapping("/{idEvento}/cerrar")
    public RespuestaEventoAdministrado cerrar(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudVersionEvento solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.cerrar(idEvento, solicitud.version(), actor);
    }

    @PostMapping("/{idEvento}/cancelar")
    public RespuestaEventoAdministrado cancelar(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudVersionEvento solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.cancelar(idEvento, solicitud.version(), actor);
    }

    @PostMapping("/{idEvento}/finalizar")
    public RespuestaEventoAdministrado finalizar(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudVersionEvento solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.finalizar(idEvento, solicitud.version(), actor);
    }

    @GetMapping("/{idEvento}/imagen")
    public ResponseEntity<Resource> consultarImagen(@PathVariable Long idEvento) {
        var imagen = servicioAdministracion.cargarImagen(idEvento);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.noCache())
                .body(imagen.recurso());
    }

    @PostMapping(value = "/{idEvento}/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RespuestaEventoAdministrado agregarImagen(
            @PathVariable Long idEvento,
            @RequestParam MultipartFile archivo,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.agregarImagen(idEvento, archivo, actor);
    }

    @DeleteMapping("/{idEvento}/imagen")
    public RespuestaEventoAdministrado eliminarImagen(
            @PathVariable Long idEvento,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.eliminarImagen(idEvento, actor);
    }

    @GetMapping("/{idEvento}/imagenes-secundarias")
    public List<RespuestaImagenEventoAdministrada> listarImagenesSecundarias(
            @PathVariable Long idEvento) {
        return servicioAdministracion.listarImagenesSecundarias(idEvento);
    }

    @GetMapping("/{idEvento}/imagenes-secundarias/{idImagenEvento}/archivo")
    public ResponseEntity<Resource> consultarImagenSecundaria(
            @PathVariable Long idEvento,
            @PathVariable Long idImagenEvento) {
        var imagen = servicioAdministracion.cargarImagenSecundaria(idEvento, idImagenEvento);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.noCache())
                .body(imagen.recurso());
    }

    @PostMapping(value = "/{idEvento}/imagenes-secundarias", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaImagenEventoAdministrada agregarImagenSecundaria(
            @PathVariable Long idEvento,
            @RequestParam MultipartFile archivo,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.agregarImagenSecundaria(idEvento, archivo, actor);
    }

    @DeleteMapping("/{idEvento}/imagenes-secundarias/{idImagenEvento}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarImagenSecundaria(
            @PathVariable Long idEvento,
            @PathVariable Long idImagenEvento,
            @AuthenticationPrincipal UsuarioSesion actor) {
        servicioAdministracion.eliminarImagenSecundaria(idEvento, idImagenEvento, actor);
    }

    @GetMapping("/{idEvento}/inscripciones")
    public RespuestaPaginaPublica<RespuestaInscripcionAdministrada> listarInscripciones(
            @PathVariable Long idEvento,
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioAdministracion.listarInscripciones(
                idEvento, busqueda, estado, pagina, tamano);
    }
}
