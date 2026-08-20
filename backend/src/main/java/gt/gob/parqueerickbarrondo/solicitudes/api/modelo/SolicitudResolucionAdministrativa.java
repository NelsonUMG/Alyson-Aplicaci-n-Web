package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudResolucionAdministrativa(
        @NotBlank(message = "Selecciona una decisión.")
        @Pattern(regexp = "APROBADA|RECHAZADA", message = "La decisión debe ser aprobada o rechazada.")
        String decision,
        @NotBlank(message = "La respuesta u observación es obligatoria.")
        @Size(max = 5000, message = "La respuesta no puede superar 5000 caracteres.")
        String respuesta,
        @NotNull(message = "La versión de la solicitud es obligatoria.")
        Long version) {
}
