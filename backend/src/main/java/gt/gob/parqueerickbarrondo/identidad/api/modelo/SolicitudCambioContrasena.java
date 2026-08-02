package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCambioContrasena(
        @NotBlank @Size(max = 128) String contrasenaActual,
        @NotBlank @Size(max = 128) String contrasenaNueva) {
}
