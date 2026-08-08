package gt.gob.parqueerickbarrondo.bicicletas.api;

import java.util.List;

import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.RespuestaBicicletaAdministrada;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.RespuestaHistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudActualizacionBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudCambioEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudRegistroBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.aplicacion.ServicioAdministracionBicicletas;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/administracion/bicicletas")
public class ControladorAdministracionBicicletas {

    private final ServicioAdministracionBicicletas servicioAdministracion;

    public ControladorAdministracionBicicletas(
            ServicioAdministracionBicicletas servicioAdministracion) {
        this.servicioAdministracion = servicioAdministracion;
    }

    @GetMapping
    public RespuestaPaginaPublica<RespuestaBicicletaAdministrada> listar(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioAdministracion.listar(busqueda, estado, pagina, tamano);
    }

    @GetMapping("/{idBicicleta}")
    public RespuestaBicicletaAdministrada consultar(@PathVariable Long idBicicleta) {
        return servicioAdministracion.consultar(idBicicleta);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaBicicletaAdministrada crear(
            @Valid @RequestBody SolicitudRegistroBicicleta solicitud,
            @RequestHeader(value = "Idempotency-Key", required = false) String claveIdempotencia,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.crear(solicitud, claveIdempotencia, actor);
    }

    @PutMapping("/{idBicicleta}")
    public RespuestaBicicletaAdministrada actualizarInventario(
            @PathVariable Long idBicicleta,
            @Valid @RequestBody SolicitudActualizacionBicicleta solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.actualizarInventario(idBicicleta, solicitud, actor);
    }

    @PostMapping("/{idBicicleta}/estado")
    public RespuestaBicicletaAdministrada cambiarEstado(
            @PathVariable Long idBicicleta,
            @Valid @RequestBody SolicitudCambioEstadoBicicleta solicitud,
            @RequestHeader(value = "Idempotency-Key", required = false) String claveIdempotencia,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioAdministracion.cambiarEstado(
                idBicicleta, solicitud, claveIdempotencia, actor);
    }

    @GetMapping("/{idBicicleta}/historial")
    public List<RespuestaHistorialEstadoBicicleta> listarHistorial(
            @PathVariable Long idBicicleta) {
        return servicioAdministracion.listarHistorial(idBicicleta);
    }
}
