package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.util.List;

public record RespuestaPaginaSolicitudesUsuario(
        List<RespuestaSolicitudUsuario> contenido,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas,
        RespuestaConteosSolicitudes conteos) {
}
