package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.math.BigDecimal;
import java.time.Instant;

public record RespuestaAreaPublica(
        String codigo,
        Integer numeroVisibleMapa,
        String nombre,
        String descripcion,
        String estado,
        String notaDisponibilidad,
        String codigoCategoria,
        String nombreCategoria,
        String horarioJson,
        BigDecimal latitud,
        BigDecimal longitud,
        Instant actualizadoEn,
        String urlImagen) {
}
