package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

public record RespuestaImagenAdministrada(
        Long idImagenPublicacion,
        String nombreArchivoOriginal,
        String tipoMedio,
        long tamanoBytes,
        int anchoPixeles,
        int altoPixeles,
        String textoAlternativo,
        short ordenVisualizacion) {
}
