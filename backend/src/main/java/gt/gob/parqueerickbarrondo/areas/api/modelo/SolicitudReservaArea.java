package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudReservaArea(
        @NotBlank
        @Size(max = 150)
        String titulo,

        @NotNull
        Instant iniciaEn,

        @NotNull
        Instant finalizaEn,

        @NotBlank
        @Size(max = 32)
        String estado,

        @Size(max = 300)
        String observaciones,

        Long version) {
}
