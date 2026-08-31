package gt.gob.parqueerickbarrondo.areas.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCategoriaArea(
        @NotBlank(message = "El nombre es obligatorio.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String nombre,
        @Size(max = 300, message = "La descripción no puede superar 300 caracteres.")
        String descripcion,
        boolean activa,
        Long version) {
}
