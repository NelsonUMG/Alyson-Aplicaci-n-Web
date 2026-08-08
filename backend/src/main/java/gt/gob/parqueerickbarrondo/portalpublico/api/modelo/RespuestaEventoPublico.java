package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;

public record RespuestaEventoPublico(
        Long idEvento,
        String identificadorUrl,
        String titulo,
        String descripcion,
        String lugar,
        Instant iniciaEn,
        Instant finalizaEn,
        Instant inscripcionAbreEn,
        Instant inscripcionCierraEn,
        int capacidadTotal,
        int cuposDisponibles,
        String estado,
        String urlImagen) {
}
