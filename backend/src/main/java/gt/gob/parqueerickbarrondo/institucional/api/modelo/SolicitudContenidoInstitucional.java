package gt.gob.parqueerickbarrondo.institucional.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudContenidoInstitucional(
        @NotBlank @Size(max = 1000) String resumen,
        @NotBlank @Size(max = 4000) String mision,
        @NotBlank @Size(max = 4000) String vision,
        @NotBlank @Size(max = 4000) String valores,
        @NotNull Long version) {
}
