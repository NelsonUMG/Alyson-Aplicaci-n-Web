package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudInicioTramite(
        @NotBlank @Size(max = 200) String nombreCompleto,
        @NotBlank @Pattern(regexp = "\\d{13}", message = "El DPI/CUI debe contener 13 dígitos.") String dpi,
        @NotBlank @Size(max = 30) String telefono,
        @NotBlank @Email @Size(max = 254) String correo,
        @NotNull Boolean representanteLegal,
        @Size(max = 200) String institucion) {
}
