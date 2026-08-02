package gt.gob.parqueerickbarrondo.identidad.api.modelo;

import java.util.Set;

import jakarta.validation.constraints.NotNull;

public record SolicitudActualizacionRoles(
        @NotNull Set<String> codigosRoles,
        @NotNull Long versionUsuario) {
}
