package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudRestablecerContrasena(
        @NotBlank @Size(max = 128) String token,
        @NotBlank @Size(min = 12, max = 128) String contrasenaNueva,
        @NotBlank @Size(min = 12, max = 128) String confirmarContrasena) { }
