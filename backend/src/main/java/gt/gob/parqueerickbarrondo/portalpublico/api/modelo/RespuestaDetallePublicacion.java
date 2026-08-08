package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.time.LocalDate;

public record RespuestaDetallePublicacion(
        String identificadorUrl,
        String titulo,
        String resumen,
        String contenido,
        String codigoCategoria,
        String nombreCategoria,
        LocalDate fechaEditorial,
        Instant publicadoEn,
        RespuestaImagenPublica imagenPrincipal) {
}
