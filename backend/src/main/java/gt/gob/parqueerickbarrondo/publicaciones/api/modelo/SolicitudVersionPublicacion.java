package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record SolicitudVersionPublicacion(
        @NotNull(message = "La versión de la publicación es obligatoria.")
        @PositiveOrZero(message = "La versión de la publicación no es válida.")
        Long version) {
}
