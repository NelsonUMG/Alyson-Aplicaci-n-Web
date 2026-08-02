package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.util.Set;

public record RespuestaPerfil(
        Long idUsuario,
        String correo,
        String nombre,
        String apellido,
        Set<String> roles,
        Set<String> permisos) {
}
