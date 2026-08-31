package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.util.List;

public record RespuestaCategoriaTramite(
        Long idCategoria,
        String codigo,
        String nombre,
        List<RespuestaTramiteResumen> tramites) {
}
