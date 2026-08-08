package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudCategoriaPublicacion(
        @NotBlank(message = "El código de la categoría es obligatorio.")
        @Size(max = 64, message = "El código de la categoría no puede superar 64 caracteres.")
        @Pattern(regexp = "[A-Za-z0-9_-]+", message = "El código de la categoría contiene caracteres no permitidos.")
        String codigo,

        @NotBlank(message = "El nombre de la categoría es obligatorio.")
        @Size(max = 100, message = "El nombre de la categoría no puede superar 100 caracteres.")
        String nombre,

        @Size(max = 300, message = "La descripción de la categoría no puede superar 300 caracteres.")
        String descripcion,

        @Min(value = 0, message = "El orden de la categoría no puede ser negativo.")
        @Max(value = 32767, message = "El orden de la categoría supera el máximo permitido.")
        int ordenVisualizacion,

        boolean activa,
        Long version) {
}
