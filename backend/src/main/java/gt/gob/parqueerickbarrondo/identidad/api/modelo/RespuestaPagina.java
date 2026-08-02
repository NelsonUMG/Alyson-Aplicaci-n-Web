package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.util.List;

public record RespuestaPagina<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas) {
}
