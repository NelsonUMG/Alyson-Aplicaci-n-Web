package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.Instant;

public record RespuestaResenaTramite(
        Long idResena,
        String nombreUsuario,
        short estrellas,
        String comentario,
        Instant actualizadoEn,
        boolean propia) {
}
