package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.math.BigDecimal;

public record RespuestaConexionMapaPublica(
        Long idConexionMapa,
        Long idNodoOrigen,
        Long idNodoDestino,
        BigDecimal distanciaMetros,
        boolean bidireccional,
        boolean accesible,
        boolean cerrada,
        String motivoCierre) {
}
