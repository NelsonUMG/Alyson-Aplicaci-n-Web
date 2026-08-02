package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudRegistroCuenta(
        @NotBlank @Size(max = 80) String nombre,
        @NotBlank @Size(max = 80) String apellido,
        @NotBlank @Email @Size(max = 254) String correo,
        @NotBlank @Size(max = 128) String contrasena,
        @AssertTrue(message = "Debes aceptar las condiciones de uso aplicables.") boolean aceptaTerminos) {
}
