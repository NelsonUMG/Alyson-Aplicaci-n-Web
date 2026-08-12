package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.util.List;

import gt.gob.parqueerickbarrondo.areas.api.modelo.CoordenadaAreaMapa;

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
        List<CoordenadaAreaMapa> perimetro) {
}
