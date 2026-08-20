package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

public record DocumentoSolicitudAlmacenado(
        String claveAlmacenamiento,
        String nombreArchivoOriginal,
        String tipoMedio,
        long tamanoBytes) {
}
