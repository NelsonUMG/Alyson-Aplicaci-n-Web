package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.time.Instant;

public record RespuestaEventoAuditoria(
        Long idEventoAuditoria,
        Long idUsuarioActor,
        String nombreActor,
        String codigoAccion,
        String tipoRecurso,
        String idRecurso,
        String resultado,
        String idCorrelacion,
        Instant ocurridoEn) {
}
