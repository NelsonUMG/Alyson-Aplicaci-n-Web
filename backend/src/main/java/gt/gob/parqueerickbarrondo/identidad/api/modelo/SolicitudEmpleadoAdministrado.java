package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.time.LocalDate;
import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudEmpleadoAdministrado(
        @NotBlank @Size(max = 80) String nombre,
        @NotBlank @Size(max = 80) String apellido,
        @NotBlank @Email @Size(max = 254) String correo,
        @NotBlank @Pattern(regexp = "\\d{13}", message = "El DPI o CUI debe contener exactamente 13 números.") String dpi,
        @NotBlank @Pattern(regexp = "\\d{8}", message = "El celular debe contener exactamente 8 números.") String celular,
        @NotNull @Past(message = "La fecha de nacimiento debe ser anterior a hoy.") LocalDate fechaNacimiento,
        @NotBlank @Size(max = 128) String contrasenaInicial,
        @NotNull @Size(min = 1, max = 20) Set<String> codigosRoles) {
}
