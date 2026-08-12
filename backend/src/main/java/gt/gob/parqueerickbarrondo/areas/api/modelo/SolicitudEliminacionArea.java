package gt.gob.parqueerickbarrondo.areas.api.modelo;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record SolicitudEliminacionArea(
        @NotNull(message = "La versión del área es obligatoria.")
        @PositiveOrZero(message = "La versión del área no es válida.")
        Long version) {
}
