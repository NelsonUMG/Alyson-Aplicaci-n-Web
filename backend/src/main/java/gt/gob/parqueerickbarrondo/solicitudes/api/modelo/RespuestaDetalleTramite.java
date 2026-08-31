package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.util.List;

public record RespuestaDetalleTramite(
        Long idTramite,
        String codigo,
        String nombre,
        String resumen,
        String acerca,
        List<String> requisitos,
        List<String> documentosRequeridos,
        String costo,
        String tiempoRespuesta,
        boolean requiereReserva,
        String categoria,
        String urlPortada,
        double promedioEstrellas,
        long totalResenas,
        List<RespuestaResenaTramite> resenas) {
}
