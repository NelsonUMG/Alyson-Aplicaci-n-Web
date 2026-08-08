package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import jakarta.validation.constraints.AssertTrue;

public record SolicitudInscripcionEvento(
        @AssertTrue(message = "Debes aceptar los requisitos antes de confirmar la inscripción.")
        boolean aceptaRequisitos) {
}
