package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudInicioSesion(
        @NotBlank @Email @Size(max = 254) String correo,
        @NotBlank @Size(max = 128) String contrasena,
        boolean mantenerSesionActiva) {
}
