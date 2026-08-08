package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;
import java.time.Instant;

public record RespuestaNodoMapaAdministrado(
        Long idNodoMapa,
        Long idArea,
        String codigoArea,
        String nombreArea,
        String tipoNodo,
        String nombre,
        BigDecimal latitud,
        BigDecimal longitud,
        boolean coordenadasConfirmadas,
        boolean accesible,
        Instant actualizadoEn,
        Long version) {
}
