package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudDenunciaQueja(
        @NotBlank @Pattern(regexp = "DENUNCIA|QUEJA", message = "Selecciona denuncia o queja.") String tipo,
        @NotBlank @Size(max = 180) String asunto,
        @NotBlank @Size(max = 3000) String descripcion) {
}
