package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SolicitudPublicacion(
        @NotNull(message = "La categoría es obligatoria.")
        @Positive(message = "La categoría seleccionada no es válida.")
        Long idCategoriaPublicacion,

        @NotBlank(message = "El título es obligatorio.")
        @Size(max = 180, message = "El título no puede superar 180 caracteres.")
        String titulo,

        @NotBlank(message = "El resumen es obligatorio.")
        @Size(max = 500, message = "El resumen no puede superar 500 caracteres.")
        String resumen,

        @NotBlank(message = "El contenido es obligatorio.")
        @Size(max = 200000, message = "El contenido no puede superar 200000 caracteres.")
        String contenido,

        LocalDate fechaEditorial,
        Long version) {
}
