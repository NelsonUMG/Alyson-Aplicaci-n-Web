package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;
import java.time.Instant;

public record RespuestaAreaAdministrada(
        Long idArea,
        Long idCategoriaArea,
        String codigoCategoria,
        String nombreCategoria,
        String codigo,
        Integer numeroVisibleMapa,
        String nombre,
        String descripcion,
        String estado,
        String notaDisponibilidad,
        BigDecimal latitud,
        BigDecimal longitud,
        boolean coordenadasConfirmadas,
        String horarioJson,
        String observacionesInternas,
        boolean tieneImagen,
        String urlImagen,
        Long idActualizadoPor,
        String nombreActualizadoPor,
        Instant creadoEn,
        Instant actualizadoEn,
        Long version) {
}
