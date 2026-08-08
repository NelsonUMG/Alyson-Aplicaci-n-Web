package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.time.Instant;

public record RespuestaReservaAreaAdministrada(
        Long idReservaArea,
        Long idArea,
        String codigoArea,
        String nombreArea,
        String titulo,
        Instant iniciaEn,
        Instant finalizaEn,
        String estado,
        String observaciones,
        Long idActualizadoPor,
        String nombreActualizadoPor,
        Instant creadoEn,
        Instant actualizadoEn,
        Long version) {
}
