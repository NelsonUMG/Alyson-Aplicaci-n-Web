package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

public record RespuestaTramiteResumen(
        Long idTramite,
        String codigo,
        String nombre,
        String resumen,
        boolean requiereReserva,
        String urlPortada) {
}
