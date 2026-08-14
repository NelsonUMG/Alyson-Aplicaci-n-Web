package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;

public record RespuestaInscripcionAdministrada(
        Long idInscripcionEvento,
        Long idUsuario,
        String nombre,
        String apellido,
        String correo,
        String estado,
        Instant requisitosAceptadosEn,
        Instant confirmadaEn,
        Instant canceladaEn,
        String motivoCancelacion,
        String respuestasFormularioJson,
        Instant creadoEn,
        Instant actualizadoEn) {
}
