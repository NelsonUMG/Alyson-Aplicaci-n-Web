package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record CoordenadaAreaMapa(
        @NotNull(message = "La latitud del vértice es obligatoria.")
        @DecimalMin(value = "-90", message = "La latitud del vértice no es válida.")
        @DecimalMax(value = "90", message = "La latitud del vértice no es válida.")
        BigDecimal latitud,
        @NotNull(message = "La longitud del vértice es obligatoria.")
        @DecimalMin(value = "-180", message = "La longitud del vértice no es válida.")
        @DecimalMax(value = "180", message = "La longitud del vértice no es válida.")
        BigDecimal longitud) {
}
