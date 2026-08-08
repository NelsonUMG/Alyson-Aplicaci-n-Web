package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudConexionMapa(
        @NotNull(message = "El nodo de origen es obligatorio.")
        Long idNodoOrigen,
        @NotNull(message = "El nodo de destino es obligatorio.")
        Long idNodoDestino,
        @NotNull(message = "La distancia es obligatoria.")
        @DecimalMin(value = "0.01", message = "La distancia debe ser mayor que cero.")
        BigDecimal distanciaMetros,
        boolean bidireccional,
        boolean accesible,
        boolean cerrada,
        @Size(max = 300, message = "El motivo de cierre no puede superar 300 caracteres.")
        String motivoCierre,
        Long version) {
}
