package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;

public record RespuestaPersonaInscritaReporte(
        Long idInscripcionEvento,
        Long idUsuario,
        String nombre,
        String apellido,
        String correo,
        String codigoGrupo,
        Instant confirmadaEn) {
}
