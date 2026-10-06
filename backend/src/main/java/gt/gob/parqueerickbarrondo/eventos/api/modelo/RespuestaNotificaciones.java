package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.util.List;

public record RespuestaNotificaciones(long noLeidas, List<RespuestaNotificacion> contenido) {
}
