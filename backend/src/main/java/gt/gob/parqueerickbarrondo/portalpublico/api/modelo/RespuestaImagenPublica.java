package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

public record RespuestaImagenPublica(
        Long idImagenPublicacion,
        String url,
        String textoAlternativo,
        int anchoPixeles,
        int altoPixeles) {
}
