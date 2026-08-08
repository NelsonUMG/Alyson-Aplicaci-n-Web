package gt.gob.parqueerickbarrondo.publicaciones.aplicacion;

public record ArchivoImagenAlmacenada(
        String claveAlmacenamiento,
        String nombreArchivoOriginal,
        String tipoMedio,
        long tamanoBytes,
        int anchoPixeles,
        int altoPixeles) {
}
