package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.util.Map;

public record RespuestaResumenBicicletas(
        long total,
        long disponibles,
        Map<String, Long> cantidadesPorEstado,
        Instant actualizadoEn) {
}
