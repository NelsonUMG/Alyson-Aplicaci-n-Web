package gt.gob.parqueerickbarrondo.bicicletas.api.modelo;

import java.time.Instant;

public record RespuestaHistorialEstadoBicicleta(
        Long idHistorialEstadoBicicleta,
        String estadoAnterior,
        String estadoNuevo,
        String motivo,
        Long idCambiadoPor,
        String nombreCambiadoPor,
        Instant cambiadoEn) {
}
