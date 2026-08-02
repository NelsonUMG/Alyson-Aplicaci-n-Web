package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.time.Instant;
import java.util.Set;

public record RespuestaUsuarioAdministrado(
        Long idUsuario,
        String correo,
        String nombre,
        String apellido,
        String estado,
        Instant ultimoAccesoEn,
        Long version,
        Set<String> roles) {
}
