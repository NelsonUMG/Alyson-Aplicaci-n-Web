package gt.gob.parqueerickbarrondo.areas.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudCategoriaArea(
        @NotBlank(message = "El código es obligatorio.")
        @Size(max = 64, message = "El código no puede superar 64 caracteres.")
        @Pattern(regexp = "[A-Za-z0-9_-]+", message = "El código solo puede contener letras, números, guiones y guion bajo.")
        String codigo,
        @NotBlank(message = "El nombre es obligatorio.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String nombre,
        @Size(max = 300, message = "La descripción no puede superar 300 caracteres.")
        String descripcion,
        boolean activa,
        Long version) {
}
