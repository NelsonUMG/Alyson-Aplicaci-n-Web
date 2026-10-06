package gt.gob.parqueerickbarrondo.apariencia;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record Apariencia(String colorPrincipal, String portadaUrl, long version) {
    public record Cambio(@NotNull @Pattern(regexp = "#[0-9a-fA-F]{6}", message = "Selecciona un color válido.") String colorPrincipal,
                         @NotNull @PositiveOrZero Long version,
                         boolean quitarPortada) { }
}
