package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudEvento(
        @NotBlank(message = "El título es obligatorio.")
        @Size(max = 180, message = "El título no puede superar 180 caracteres.")
        String titulo,
        @NotBlank(message = "La descripción es obligatoria.")
        @Size(max = 20000, message = "La descripción no puede superar 20000 caracteres.")
        String descripcion,
        @Size(max = 180, message = "El lugar no puede superar 180 caracteres.")
        String lugar,
        @NotNull(message = "La fecha de inicio es obligatoria.")
        Instant iniciaEn,
        Instant finalizaEn,
        Instant inscripcionAbreEn,
        Instant inscripcionCierraEn,
        @Min(value = 0, message = "La capacidad total no puede ser negativa.")
        int capacidadTotal,
        @Size(max = 10000, message = "El formulario no puede superar 10000 caracteres.")
        String esquemaFormularioJson,
        @Valid
        @Size(max = 30, message = "Un evento no puede tener más de 30 requisitos.")
        List<SolicitudRequisitoEvento> requisitos,
        Long version) {

    public SolicitudEvento {
        requisitos = requisitos == null ? List.of() : List.copyOf(requisitos);
    }
}
