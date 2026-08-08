package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.util.List;

public record RespuestaPaginaPublica<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas) {
}
