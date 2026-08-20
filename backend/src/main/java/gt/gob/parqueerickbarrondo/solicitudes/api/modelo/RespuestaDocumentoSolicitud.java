package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.Instant;

public record RespuestaDocumentoSolicitud(
        Long idSolicitudDocumento,
        String categoriaDocumento,
        String nombreCategoria,
        boolean obligatorio,
        String nombreArchivo,
        String tipoMedio,
        long tamanoBytes,
        Instant creadoEn,
        String urlDescarga) {
}
