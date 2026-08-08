package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

import java.time.Instant;
import java.time.LocalDate;

public record RespuestaPublicacionAdministrada(
        Long idPublicacion,
        Long idCategoriaPublicacion,
        String codigoCategoria,
        String nombreCategoria,
        String titulo,
        String identificadorUrl,
        String resumen,
        String contenido,
        String estado,
        LocalDate fechaEditorial,
        Instant publicadoEn,
        Instant actualizadoEn,
        Long version) {
}
