package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudActualizacionPerfil(
        @NotBlank(message = "Los nombres son obligatorios.")
        @Size(max = 80, message = "Los nombres no pueden superar 80 caracteres.")
        String nombre,

        @NotBlank(message = "Los apellidos son obligatorios.")
        @Size(max = 80, message = "Los apellidos no pueden superar 80 caracteres.")
        String apellido,

        @NotBlank(message = "El lugar de extensión del DPI es obligatorio.")
        @Size(max = 120, message = "El lugar de extensión no puede superar 120 caracteres.")
        String dpiExtendidoEn,

        @NotNull(message = "La fecha de nacimiento es obligatoria.")
        @Past(message = "La fecha de nacimiento debe ser anterior a hoy.")
        LocalDate fechaNacimiento,

        @NotBlank(message = "El celular es obligatorio.")
        @Pattern(regexp = "\\d{8}", message = "El celular debe contener exactamente 8 números.")
        String celular,

        @Pattern(regexp = "^$|[0-9+() -]{7,24}", message = "El teléfono contiene caracteres no válidos.")
        String telefono,

        @Size(max = 300, message = "La dirección no puede superar 300 caracteres.")
        String direccion) {
}
