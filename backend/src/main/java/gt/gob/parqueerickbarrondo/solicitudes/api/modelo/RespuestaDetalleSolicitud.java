package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.Instant;
import java.util.List;

public record RespuestaDetalleSolicitud(
        Long idSolicitud,
        String tipoSolicitud,
        String nombreTipoSolicitud,
        String estado,
        DetalleUsoInstalacionSolicitud detalle,
        List<RespuestaDocumentoSolicitud> documentos,
        String resolucion,
        Instant creadoEn,
        Instant actualizadoEn,
        Instant resueltoEn,
        Long version) {
}
