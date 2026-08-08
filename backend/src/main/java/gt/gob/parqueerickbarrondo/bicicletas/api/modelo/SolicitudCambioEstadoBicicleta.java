package gt.gob.parqueerickbarrondo.bicicletas.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudCambioEstadoBicicleta(
        @NotBlank(message = "El nuevo estado es obligatorio.")
        @Size(max = 32, message = "El estado no es válido.")
        String estado,
        @NotBlank(message = "El motivo del cambio de estado es obligatorio.")
        @Size(max = 500, message = "El motivo no puede superar 500 caracteres.")
        String motivo,
        @NotNull(message = "La versión de la bicicleta es obligatoria.")
        Long version) {
}
