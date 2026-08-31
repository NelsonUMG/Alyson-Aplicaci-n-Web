package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudTramiteAdministrado(
        @NotNull(message = "Selecciona una categoría.") Long idCategoria,
        @NotBlank @Size(max = 180) String nombre,
        @NotBlank @Size(max = 500) String resumen,
        @NotBlank @Size(max = 8000) String acerca,
        @NotNull List<@NotBlank @Size(max = 500) String> requisitos,
        @NotNull List<@NotBlank @Size(max = 500) String> documentosRequeridos,
        @NotBlank @Size(max = 180) String costo,
        @NotBlank @Size(max = 180) String tiempoRespuesta,
        boolean requiereReserva,
        boolean activo,
        Long version) {
}
