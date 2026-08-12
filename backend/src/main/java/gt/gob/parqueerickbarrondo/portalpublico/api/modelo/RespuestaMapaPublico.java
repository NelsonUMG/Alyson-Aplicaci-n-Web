package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.util.List;

public record RespuestaMapaPublico(
        List<RespuestaNodoMapaPublico> nodos,
        List<RespuestaConexionMapaPublica> conexiones,
        List<RespuestaAreaMapaPublica> areas,
        Instant actualizadoEn) {
}
