package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

public record RespuestaConteosSolicitudes(
        long borradores,
        long enProceso,
        long finalizadas,
        long rechazadas) {
}
