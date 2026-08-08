package gt.gob.parqueerickbarrondo.bicicletas.api.modelo;

import java.time.Instant;

public record RespuestaBicicletaAdministrada(
        Long idBicicleta,
        String codigo,
        String estado,
        String observacionesInventario,
        boolean tienePrestamoActivo,
        Long idActualizadoPor,
        String nombreActualizadoPor,
        Instant creadoEn,
        Instant actualizadoEn,
        Long version) {
}
