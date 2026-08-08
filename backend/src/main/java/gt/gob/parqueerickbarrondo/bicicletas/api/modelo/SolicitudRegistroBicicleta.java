package gt.gob.parqueerickbarrondo.bicicletas.api.modelo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudRegistroBicicleta(
        @NotBlank(message = "El código de la bicicleta es obligatorio.")
        @Size(max = 64, message = "El código no puede superar 64 caracteres.")
        @Pattern(
                regexp = "[A-Za-z0-9_-]+",
                message = "El código solo puede contener letras, números, guiones y guion bajo.")
        String codigo,
        @NotBlank(message = "El estado inicial es obligatorio.")
        @Size(max = 32, message = "El estado inicial no es válido.")
        String estadoInicial,
        @Size(max = 500, message = "Las observaciones no pueden superar 500 caracteres.")
        String observacionesInventario,
        @NotBlank(message = "El motivo del estado inicial es obligatorio.")
        @Size(max = 500, message = "El motivo no puede superar 500 caracteres.")
        String motivoEstadoInicial) {
}
