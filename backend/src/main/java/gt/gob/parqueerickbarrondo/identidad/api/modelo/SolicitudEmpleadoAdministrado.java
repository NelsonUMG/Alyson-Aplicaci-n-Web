package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudEmpleadoAdministrado(
        @NotBlank @Size(max = 80) String nombre,
        @NotBlank @Size(max = 80) String apellido,
        @NotBlank @Email @Size(max = 254) String correo,
        @NotBlank @Size(max = 128) String contrasenaInicial,
        @NotNull @Size(max = 20) Set<String> codigosRoles) {
}
