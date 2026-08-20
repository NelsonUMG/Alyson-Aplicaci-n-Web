package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.LocalDate;

public record DatosSolicitanteSolicitud(
        String nombre,
        String apellido,
        String correo,
        String dpi,
        String celular,
        LocalDate fechaNacimiento) {
}
