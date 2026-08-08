package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import jakarta.validation.constraints.NotNull;

public record SolicitudVersionEvento(
        @NotNull(message = "La versión del evento es obligatoria.")
        Long version) {
}
