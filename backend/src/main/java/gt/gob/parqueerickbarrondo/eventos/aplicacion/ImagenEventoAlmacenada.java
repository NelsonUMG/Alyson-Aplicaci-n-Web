package gt.gob.parqueerickbarrondo.eventos.aplicacion;

public record ImagenEventoAlmacenada(
        String claveAlmacenamiento,
        String nombreArchivoOriginal,
        String tipoMedio,
        long tamanoBytes,
        int anchoPixeles,
        int altoPixeles) {
}
