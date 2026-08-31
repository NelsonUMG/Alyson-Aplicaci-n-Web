package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

public record RespuestaCategoriaTramiteAdministrada(
        Long idCategoria,
        String codigo,
        String nombre,
        short ordenVisualizacion,
        boolean activa) {
}
