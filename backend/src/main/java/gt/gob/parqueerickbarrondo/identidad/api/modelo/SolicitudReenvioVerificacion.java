package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudReenvioVerificacion(
        @NotBlank(message = "El correo electrónico es obligatorio.")
        @Email(message = "Ingresa un correo electrónico válido.")
        @Size(max = 254, message = "El correo electrónico no puede superar 254 caracteres.")
        String correo) {
}
