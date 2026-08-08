package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;
import java.time.Instant;

public record RespuestaConexionMapaAdministrada(
        Long idConexionMapa,
        Long idNodoOrigen,
        String nombreNodoOrigen,
        Long idNodoDestino,
        String nombreNodoDestino,
        BigDecimal distanciaMetros,
        boolean bidireccional,
        boolean accesible,
        boolean cerrada,
        String motivoCierre,
        Instant actualizadoEn,
        Long version) {
}
