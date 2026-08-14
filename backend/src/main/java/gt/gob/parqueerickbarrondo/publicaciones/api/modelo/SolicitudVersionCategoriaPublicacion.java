package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record SolicitudVersionCategoriaPublicacion(
        @NotNull(message = "La versión de la categoría es obligatoria.")
        @PositiveOrZero(message = "La versión de la categoría no es válida.")
        Long version) {
}
