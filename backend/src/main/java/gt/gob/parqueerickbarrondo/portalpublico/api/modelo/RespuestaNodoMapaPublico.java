package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.math.BigDecimal;
import java.time.Instant;

public record RespuestaNodoMapaPublico(
        Long idNodoMapa,
        String tipoNodo,
        String nombre,
        BigDecimal latitud,
        BigDecimal longitud,
        boolean accesible,
        Long idArea,
        String codigoArea,
        String nombreArea,
        String estadoArea,
        String estadoCalculadoArea,
        boolean disponibleAhora,
        Instant cambiaEstadoEn,
        String tituloReservaActiva,
        String tituloProximaReserva,
        String notaDisponibilidad) {
}
