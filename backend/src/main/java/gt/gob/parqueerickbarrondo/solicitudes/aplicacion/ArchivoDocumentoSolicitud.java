package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import org.springframework.core.io.Resource;

public record ArchivoDocumentoSolicitud(
        Resource recurso,
        String tipoMedio,
        long tamanoBytes,
        String nombreArchivo) {
}
