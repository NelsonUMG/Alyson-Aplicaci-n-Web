package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record RespuestaDetallePublicacion(
        String identificadorUrl,
        String titulo,
        String resumen,
        String contenido,
        String codigoCategoria,
        String nombreCategoria,
        LocalDate fechaEditorial,
        Instant publicadoEn,
        RespuestaImagenPublica imagenPrincipal,
        List<RespuestaImagenPublica> imagenesSecundarias) {
}
