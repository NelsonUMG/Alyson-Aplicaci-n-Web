package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.time.Instant;

public record RespuestaHistorialEstadoArea(
        Long idHistorialEstadoArea,
        String estadoAnterior,
        String estadoNuevo,
        String motivo,
        Long idCambiadoPor,
        String nombreCambiadoPor,
        Instant cambiadoEn) {
}
