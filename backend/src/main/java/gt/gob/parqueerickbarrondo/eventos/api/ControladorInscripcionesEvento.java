package gt.gob.parqueerickbarrondo.eventos.api;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudCancelacionInscripcion;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioInscripcionesEvento;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/eventos")
@Validated
public class ControladorInscripcionesEvento {

    private final ServicioInscripcionesEvento servicioInscripciones;

    public ControladorInscripcionesEvento(ServicioInscripcionesEvento servicioInscripciones) {
        this.servicioInscripciones = servicioInscripciones;
    }

    @GetMapping("/inscripciones/mias")
    public RespuestaPaginaPublica<RespuestaInscripcionEvento> listarPropias(
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioInscripciones.listarPropias(pagina, tamano, actor);
    }

    @GetMapping("/{idEvento}/inscripcion")
    public RespuestaInscripcionEvento consultar(
            @PathVariable Long idEvento,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioInscripciones.consultar(idEvento, actor);
    }

    @PostMapping("/{idEvento}/inscripciones")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaInscripcionEvento inscribir(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudInscripcionEvento solicitud,
            @RequestHeader("Idempotency-Key")
            @NotBlank(message = "La clave de idempotencia es obligatoria.")
            @Size(min = 8, max = 128, message = "La clave de idempotencia debe tener entre 8 y 128 caracteres.")
            String claveIdempotencia,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioInscripciones.inscribir(idEvento, solicitud, claveIdempotencia, actor);
    }

    @PostMapping("/{idEvento}/inscripciones/cancelar")
    public RespuestaInscripcionEvento cancelar(
            @PathVariable Long idEvento,
            @Valid @RequestBody SolicitudCancelacionInscripcion solicitud,
            @AuthenticationPrincipal UsuarioSesion actor) {
        return servicioInscripciones.cancelar(idEvento, solicitud, actor);
    }
}
