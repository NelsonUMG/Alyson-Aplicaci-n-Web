package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

public record SolicitudInscripcionEvento(
        @AssertTrue(message = "Debes aceptar los requisitos antes de confirmar la inscripción.")
        boolean aceptaRequisitos,
        @Size(max = 30, message = "No se pueden enviar más de 30 requisitos.")
        Map<String, Object> respuestas) {

    public SolicitudInscripcionEvento {
        respuestas = respuestas == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(respuestas));
    }

    public SolicitudInscripcionEvento(boolean aceptaRequisitos) {
        this(aceptaRequisitos, Map.of());
    }
}
