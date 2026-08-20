package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.Instant;
import java.time.LocalDate;

public record RespuestaSolicitudAdministrada(
        Long idSolicitud,
        String estado,
        String nombreSolicitante,
        String correoSolicitante,
        String nombreArea,
        LocalDate fechaSolicitada,
        Instant creadoEn,
        Instant actualizadoEn,
        Long version) {
}
