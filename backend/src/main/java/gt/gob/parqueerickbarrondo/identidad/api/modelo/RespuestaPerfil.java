package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.time.LocalDate;
import java.util.Set;

public record RespuestaPerfil(
        Long idUsuario,
        String correo,
        String nombre,
        String apellido,
        Set<String> roles,
        Set<String> permisos,
        String dpi,
        String celular,
        LocalDate fechaNacimiento,
        String dpiExtendidoEn,
        String telefono,
        String direccion,
        String urlFotoPerfil) {

    public RespuestaPerfil(
            Long idUsuario,
            String correo,
            String nombre,
            String apellido,
            Set<String> roles,
            Set<String> permisos) {
        this(idUsuario, correo, nombre, apellido, roles, permisos,
                null, null, null, null, null, null, null);
    }
}
