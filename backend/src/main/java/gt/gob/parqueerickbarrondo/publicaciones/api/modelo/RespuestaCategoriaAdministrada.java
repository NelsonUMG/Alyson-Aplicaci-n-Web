package gt.gob.parqueerickbarrondo.publicaciones.api.modelo;

public record RespuestaCategoriaAdministrada(
        Long idCategoriaPublicacion,
        String codigo,
        String nombre,
        String descripcion,
        short ordenVisualizacion,
        boolean activa,
        Long version) {
}
