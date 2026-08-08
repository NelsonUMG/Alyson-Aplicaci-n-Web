package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.math.BigDecimal;
import java.util.List;

public record RespuestaRutaMapa(
        Long idNodoOrigen,
        Long idNodoDestino,
        boolean perfilAccesible,
        BigDecimal distanciaTotalMetros,
        List<RespuestaPasoRutaMapa> pasos) {
}
