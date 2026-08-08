package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.time.LocalDate;

public record RespuestaPublicacionPublica(
        String identificadorUrl,
        String titulo,
        String resumen,
        String codigoCategoria,
        String nombreCategoria,
        LocalDate fechaEditorial,
        Instant publicadoEn,
        RespuestaImagenPublica imagenPrincipal) {
}
