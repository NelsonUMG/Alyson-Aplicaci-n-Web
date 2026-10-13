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
    @org.springframework.beans.factory.annotation.Value("${correo.verificacion.envio-habilitado:false}")
    private boolean envioHabilitado;
    private final ServicioRecuperacionContrasena servicio;
    public ControladorRecuperacionContrasena(ServicioRecuperacionContrasena servicio) { this.servicio = servicio; }

    @PostMapping("/recuperar-contrasena")
    public ResponseEntity<RespuestaMensaje> solicitar(@Valid @RequestBody SolicitudReenvioVerificacion solicitud) {
        if (!envioHabilitado) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "El envío de correo no está habilitado. Contacta al parque.");
        try { servicio.solicitar(solicitud.correo()); }
        catch (TaskRejectedException error) { throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "El servicio de correo está ocupado. Inténtalo nuevamente en unos minutos."); }
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(new RespuestaMensaje(
                "Si el correo corresponde a una cuenta activa, recibirás un enlace que vence en 1 hora. Revisa también la carpeta de spam. Puedes solicitar otro en 5 minutos."));
    }

    @PostMapping("/restablecer-contrasena")
    public ResponseEntity<RespuestaMensaje> restablecer(@Valid @RequestBody SolicitudRestablecerContrasena solicitud) {
        servicio.restablecer(solicitud);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new RespuestaMensaje(
                "Contraseña actualizada. Inicia sesión con tu nueva contraseña."));
    }
}
