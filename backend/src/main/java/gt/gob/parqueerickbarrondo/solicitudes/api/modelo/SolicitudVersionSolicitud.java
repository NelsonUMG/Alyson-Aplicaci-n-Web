package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import jakarta.validation.constraints.NotNull;

public record SolicitudVersionSolicitud(
        @NotNull(message = "La versión de la solicitud es obligatoria.")
        Long version) {
}
