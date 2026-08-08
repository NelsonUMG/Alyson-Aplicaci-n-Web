package gt.gob.parqueerickbarrondo.areas.api;

import java.time.Instant;
import java.util.List;

import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaAreaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaCategoriaAreaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaConexionMapaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaHistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaNodoMapaAdministrado;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaReservaAreaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudCategoriaArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudConexionMapa;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudNodoMapa;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudReservaArea;
import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioAdministracionAreas;
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
@RequestMapping("/api/v1/administracion")
@Validated
public class ControladorAdministracionAreas {

    private final ServicioAdministracionAreas servicioAdministracion;

    public ControladorAdministracionAreas(ServicioAdministracionAreas servicioAdministracion) {
        this.servicioAdministracion = servicioAdministracion;
    }

    @GetMapping("/categorias-areas")
    public List<RespuestaCategoriaAreaAdministrada> listarCategorias() {
        return servicioAdministracion.listarCategorias();
    }

    @PostMapping("/categorias-areas")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaCategoriaAreaAdministrada crearCategoria(
            @Valid @RequestBody SolicitudCategoriaArea solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearCategoria(solicitud, actor);
    }

    @PutMapping("/categorias-areas/{idCategoria}")
    public RespuestaCategoriaAreaAdministrada actualizarCategoria(
            @PathVariable Long idCategoria,
            @Valid @RequestBody SolicitudCategoriaArea solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarCategoria(idCategoria, solicitud, actor);
    }

    @GetMapping("/areas")
    public RespuestaPaginaPublica<RespuestaAreaAdministrada> listarAreas(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(required = false) Long idCategoria,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioAdministracion.listarAreas(
                busqueda, estado, idCategoria, pagina, tamano);
    }

    @GetMapping("/areas/{idArea}")
    public RespuestaAreaAdministrada consultarArea(@PathVariable Long idArea) {
        return servicioAdministracion.consultarArea(idArea);
    }

    @PostMapping("/areas")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaAreaAdministrada crearArea(
            @Valid @RequestBody SolicitudArea solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearArea(solicitud, actor);
    }

    @PutMapping("/areas/{idArea}")
    public RespuestaAreaAdministrada actualizarArea(
            @PathVariable Long idArea,
            @Valid @RequestBody SolicitudArea solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarArea(idArea, solicitud, actor);
    }

    @GetMapping("/areas/{idArea}/historial")
    public List<RespuestaHistorialEstadoArea> listarHistorial(@PathVariable Long idArea) {
        return servicioAdministracion.listarHistorial(idArea);
    }

    @GetMapping("/areas/{idArea}/reservas")
    public List<RespuestaReservaAreaAdministrada> listarReservasArea(
            @PathVariable Long idArea,
            @RequestParam(required = false) Instant desde,
            @RequestParam(required = false) Instant hasta) {
        return servicioAdministracion.listarReservasArea(idArea, desde, hasta);
    }

    @PostMapping("/areas/{idArea}/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaReservaAreaAdministrada crearReservaArea(
            @PathVariable Long idArea,
            @Valid @RequestBody SolicitudReservaArea solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearReservaArea(idArea, solicitud, actor);
    }

    @PutMapping("/areas/{idArea}/reservas/{idReservaArea}")
    public RespuestaReservaAreaAdministrada actualizarReservaArea(
            @PathVariable Long idArea,
            @PathVariable Long idReservaArea,
            @Valid @RequestBody SolicitudReservaArea solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarReservaArea(idArea, idReservaArea, solicitud, actor);
    }

    @GetMapping("/areas/{idArea}/imagen")
    public ResponseEntity<Resource> consultarImagen(@PathVariable Long idArea) {
        var imagen = servicioAdministracion.cargarImagen(idArea);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagen.tipoMedio()))
                .contentLength(imagen.tamanoBytes())
                .cacheControl(CacheControl.noCache())
                .body(imagen.recurso());
    }

    @PostMapping(value = "/areas/{idArea}/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RespuestaAreaAdministrada agregarImagen(
            @PathVariable Long idArea,
            @RequestParam MultipartFile archivo,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.agregarImagen(idArea, archivo, actor);
    }

    @DeleteMapping("/areas/{idArea}/imagen")
    public RespuestaAreaAdministrada eliminarImagen(
            @PathVariable Long idArea,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.eliminarImagen(idArea, actor);
    }

    @GetMapping("/mapa/nodos")
    public List<RespuestaNodoMapaAdministrado> listarNodos() {
        return servicioAdministracion.listarNodos();
    }

    @PostMapping("/mapa/nodos")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaNodoMapaAdministrado crearNodo(
            @Valid @RequestBody SolicitudNodoMapa solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearNodo(solicitud, actor);
    }

    @PutMapping("/mapa/nodos/{idNodo}")
    public RespuestaNodoMapaAdministrado actualizarNodo(
            @PathVariable Long idNodo,
            @Valid @RequestBody SolicitudNodoMapa solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarNodo(idNodo, solicitud, actor);
    }

    @DeleteMapping("/mapa/nodos/{idNodo}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarNodo(
            @PathVariable Long idNodo,
            @AuthenticationPrincipal UsuarioSesion actor) {
        servicioAdministracion.eliminarNodo(idNodo, actor);
    }

    @GetMapping("/mapa/conexiones")
    public List<RespuestaConexionMapaAdministrada> listarConexiones() {
        return servicioAdministracion.listarConexiones();
    }

    @PostMapping("/mapa/conexiones")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaConexionMapaAdministrada crearConexion(
            @Valid @RequestBody SolicitudConexionMapa solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crearConexion(solicitud, actor);
    }

    @PutMapping("/mapa/conexiones/{idConexion}")
    public RespuestaConexionMapaAdministrada actualizarConexion(
            @PathVariable Long idConexion,
            @Valid @RequestBody SolicitudConexionMapa solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarConexion(idConexion, solicitud, actor);
    }

    @DeleteMapping("/mapa/conexiones/{idConexion}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarConexion(
            @PathVariable Long idConexion,
            @AuthenticationPrincipal UsuarioSesion actor) {
        servicioAdministracion.eliminarConexion(idConexion, actor);
    }
}
