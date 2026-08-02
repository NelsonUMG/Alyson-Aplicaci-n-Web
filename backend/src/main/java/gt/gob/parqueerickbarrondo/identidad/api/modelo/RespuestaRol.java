package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.util.Set;

public record RespuestaRol(
        Long idRol,
        String codigo,
        String nombre,
        String descripcion,
        Set<String> permisos) {
}
