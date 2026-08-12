package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudRolAdministrado(
        @NotBlank @Size(max = 100) String nombre,
        @Size(max = 300) String descripcion,
        @NotNull @Size(min = 1, max = 64) Set<String> codigosPermisos) {
}
