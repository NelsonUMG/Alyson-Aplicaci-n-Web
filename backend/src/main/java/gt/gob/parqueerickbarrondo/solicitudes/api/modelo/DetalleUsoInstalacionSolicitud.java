package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.LocalDate;
import java.time.LocalTime;

public record DetalleUsoInstalacionSolicitud(
        String codigoArea,
        String nombreArea,
        LocalDate fechaSolicitada,
        LocalTime horaInicio,
        LocalTime horaFin,
        String tipoActividad,
        int cantidadPersonas,
        String descripcion,
        DatosSolicitanteSolicitud datosSolicitante,
        String codigoTramite,
        String tipoReserva,
        String centroDeportivo,
        String nombreResponsable,
        Boolean representanteLegal,
        String institucion,
        String tipoReporte,
        String asunto) {
}
