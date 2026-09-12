package gt.gob.parqueerickbarrondo.identidad.api;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.*;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioRecuperacionContrasena;
import jakarta.validation.Valid;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/autenticacion")
public class ControladorRecuperacionContrasena {
    private final ServicioRecuperacionContrasena servicio;
    public ControladorRecuperacionContrasena(ServicioRecuperacionContrasena servicio) { this.servicio = servicio; }

    @PostMapping("/recuperar-contrasena")
    public ResponseEntity<RespuestaMensaje> solicitar(@Valid @RequestBody SolicitudReenvioVerificacion solicitud) {
        try { servicio.solicitar(solicitud.correo()); }
        catch (TaskRejectedException ignorada) { /* Mantener la misma respuesta si la cola está llena. */ }
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(new RespuestaMensaje(
                "Si el correo corresponde a una cuenta verificada, recibirás un enlace que vence en 1 hora. Revisa también la carpeta de spam. Puedes solicitar otro en 5 minutos."));
    }

    @PostMapping("/restablecer-contrasena")
    public ResponseEntity<RespuestaMensaje> restablecer(@Valid @RequestBody SolicitudRestablecerContrasena solicitud) {
        servicio.restablecer(solicitud);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new RespuestaMensaje(
                "Contraseña actualizada. Inicia sesión con tu nueva contraseña."));
    }
}
