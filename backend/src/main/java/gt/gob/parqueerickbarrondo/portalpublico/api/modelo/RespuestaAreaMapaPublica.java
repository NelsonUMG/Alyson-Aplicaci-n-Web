package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.math.BigDecimal;

public record RespuestaAreaMapaPublica(
        Long idArea,
        String codigoArea,
        String nombreArea,
        String estadoArea,
        String estadoCalculadoArea,
        boolean disponibleAhora,
        Instant cambiaEstadoEn,
        String tituloReservaActiva,
        String tituloProximaReserva,
        String notaDisponibilidad,
        BigDecimal latitudCentro,
        BigDecimal longitudCentro) {
}
