package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudResenaTramite(
        @Min(value = 1, message = "La calificación mínima es una estrella.")
        @Max(value = 5, message = "La calificación máxima es de cinco estrellas.")
        short estrellas,
        @NotBlank(message = "Escribe un comentario sobre tu experiencia.")
        @Size(max = 1000, message = "El comentario no puede superar 1000 caracteres.")
        String comentario) {
}
