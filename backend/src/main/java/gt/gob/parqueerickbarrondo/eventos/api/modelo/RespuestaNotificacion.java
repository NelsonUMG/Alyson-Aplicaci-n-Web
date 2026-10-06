package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;

public record RespuestaNotificacion(
        Long idNotificacion,
        String tipo,
        String asunto,
        boolean leida,
        Instant creadaEn) {
}
