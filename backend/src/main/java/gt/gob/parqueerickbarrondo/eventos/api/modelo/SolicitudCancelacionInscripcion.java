package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import jakarta.validation.constraints.Size;

public record SolicitudCancelacionInscripcion(
        @Size(max = 300, message = "El motivo de cancelación no puede superar 300 caracteres.")
        String motivo) {
}
