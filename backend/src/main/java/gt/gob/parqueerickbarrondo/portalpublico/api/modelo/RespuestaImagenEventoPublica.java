package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

public record RespuestaImagenEventoPublica(
        Long idImagenEvento,
        String url,
        String descripcionAccesible,
        int anchoPixeles,
        int altoPixeles) {
}
