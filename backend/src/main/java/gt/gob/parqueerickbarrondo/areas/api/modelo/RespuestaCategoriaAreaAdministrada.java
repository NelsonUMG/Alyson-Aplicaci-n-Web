package gt.gob.parqueerickbarrondo.areas.api.modelo;

public record RespuestaCategoriaAreaAdministrada(
        Long idCategoriaArea,
        String codigo,
        String nombre,
        String descripcion,
        boolean activa,
        Long version) {
}
