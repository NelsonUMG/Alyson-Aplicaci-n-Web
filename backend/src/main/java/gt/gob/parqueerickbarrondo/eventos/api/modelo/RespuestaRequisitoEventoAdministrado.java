package gt.gob.parqueerickbarrondo.eventos.api.modelo;

public record RespuestaRequisitoEventoAdministrado(
        Long idRequisitoEvento,
        String descripcion,
        boolean obligatorio,
        short ordenVisualizacion) {
}
