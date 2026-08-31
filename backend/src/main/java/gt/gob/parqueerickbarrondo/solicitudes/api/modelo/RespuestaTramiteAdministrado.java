package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.util.List;

public record RespuestaTramiteAdministrado(
        Long idTramite,
        String codigo,
        Long idCategoria,
        String categoria,
        String nombre,
        String resumen,
        String acerca,
        List<String> requisitos,
        List<String> documentosRequeridos,
        String costo,
        String tiempoRespuesta,
        boolean requiereReserva,
        boolean activo,
        String urlPortada,
        Long version) {
}
