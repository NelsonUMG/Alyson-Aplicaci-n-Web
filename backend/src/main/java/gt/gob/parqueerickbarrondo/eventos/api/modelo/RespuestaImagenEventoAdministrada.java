package gt.gob.parqueerickbarrondo.eventos.api.modelo;

public record RespuestaImagenEventoAdministrada(
        Long idImagenEvento,
        String nombreArchivoOriginal,
        String url,
        int anchoPixeles,
        int altoPixeles,
        short ordenVisualizacion) {
}
