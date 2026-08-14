package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCategoriaPublicacion(
        @NotBlank(message = "El nombre de la categoría es obligatorio.")
        @Size(max = 100, message = "El nombre de la categoría no puede superar 100 caracteres.")
        String nombre,

        @Size(max = 300, message = "La descripción de la categoría no puede superar 300 caracteres.")
        String descripcion,

        @Min(value = 1, message = "El orden de la categoría debe ser mayor que cero.")
        @Max(value = 32767, message = "El orden de la categoría supera el máximo permitido.")
        int ordenVisualizacion,

        boolean activa,
        Long version) {
}
