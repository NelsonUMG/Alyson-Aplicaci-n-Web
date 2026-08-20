package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.Instant;

public record RespuestaSolicitudUsuario(
        Long idSolicitud,
        String tipoSolicitud,
        String nombreTipoSolicitud,
        String estado,
        String resolucion,
        Instant creadoEn,
        Instant actualizadoEn,
        Instant resueltoEn,
        Long version) {
}
