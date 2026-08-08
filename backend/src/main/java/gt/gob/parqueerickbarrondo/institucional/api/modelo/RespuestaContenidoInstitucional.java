package gt.gob.parqueerickbarrondo.institucional.api.modelo;

import java.time.Instant;

public record RespuestaContenidoInstitucional(
        Long idContenidoInstitucional,
        String resumen,
        String mision,
        String vision,
        String valores,
        Instant actualizadoEn,
        Long version) {
}
