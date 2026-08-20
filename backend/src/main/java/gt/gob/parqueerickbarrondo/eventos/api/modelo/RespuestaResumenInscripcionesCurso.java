package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;

public record RespuestaResumenInscripcionesCurso(
        Long idEvento,
        String titulo,
        String lugar,
        Instant iniciaEn,
        Instant finalizaEn,
        String configuracionGruposJson,
        String estado,
        int cantidadPersonasInscritas) {
}
