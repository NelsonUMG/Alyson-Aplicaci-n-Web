package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudConfirmacionCorreo(
        @NotBlank(message = "El token de verificación es obligatorio.")
        @Size(max = 200, message = "El token de verificación no es válido.")
        String token) {
}
