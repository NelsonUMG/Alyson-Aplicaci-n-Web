package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCategoriaTramiteAdministrada(
        @NotBlank(message = "El nombre de la categoría padre es obligatorio.")
        @Size(max = 160, message = "El nombre de la categoría padre no puede superar 160 caracteres.")
        String nombre) {
}
