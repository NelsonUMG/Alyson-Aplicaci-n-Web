package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudRequisitoEvento(
        @NotBlank(message = "La descripción del requisito es obligatoria.")
        @Size(max = 500, message = "La descripción del requisito no puede superar 500 caracteres.")
        String descripcion,
        boolean obligatorio,
        @Min(value = 0, message = "El orden del requisito no puede ser negativo.")
        @Max(value = 32767, message = "El orden del requisito no es válido.")
        int ordenVisualizacion) {
}
