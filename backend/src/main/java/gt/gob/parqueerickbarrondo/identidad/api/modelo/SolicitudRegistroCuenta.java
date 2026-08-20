package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudRegistroCuenta(
        @NotBlank(message = "El DPI o CUI es obligatorio.")
        @Pattern(regexp = "\\d{13}", message = "El DPI o CUI debe contener exactamente 13 números.")
        String dpi,
        @NotBlank(message = "Los nombres son obligatorios.")
        @Size(max = 80, message = "Los nombres no pueden superar 80 caracteres.")
        String nombre,
        @NotBlank(message = "Los apellidos son obligatorios.")
        @Size(max = 80, message = "Los apellidos no pueden superar 80 caracteres.")
        String apellido,
        @NotBlank(message = "El celular es obligatorio.")
        @Pattern(regexp = "\\d{8}", message = "El celular debe contener exactamente 8 números.")
        String celular,
        @NotNull(message = "La fecha de nacimiento es obligatoria.")
        @Past(message = "La fecha de nacimiento debe ser anterior a hoy.")
        LocalDate fechaNacimiento,
        @NotBlank(message = "El correo electrónico es obligatorio.")
        @Email(message = "Ingresa un correo electrónico válido.")
        @Size(max = 254, message = "El correo electrónico no puede superar 254 caracteres.")
        String correo,
        @NotBlank(message = "La contraseña es obligatoria.")
        @Size(min = 12, max = 128, message = "La contraseña debe tener entre 12 y 128 caracteres.")
        String contrasena,
        @NotBlank(message = "La confirmación de contraseña es obligatoria.")
        @Size(min = 12, max = 128, message = "La confirmación debe tener entre 12 y 128 caracteres.")
        String confirmarContrasena) {
}
