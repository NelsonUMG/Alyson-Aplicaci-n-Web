package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.LocalDate;
import jakarta.validation.constraints.*;

public record DatosParticipante(
        @NotBlank @Size(max = 120) String nombre,
        @NotBlank @Size(max = 120) String apellido,
        @NotNull @PastOrPresent LocalDate fechaNacimiento) {
}
