package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;

public record RespuestaInscripcionEvento(
        Long idInscripcionEvento,
        Long idEvento,
        String identificadorUrl,
        String tituloEvento,
        String codigoGrupo,
        String nombreGrupo,
        String estado,
        Instant iniciaEn,
        String lugar,
        Instant requisitosAceptadosEn,
        Instant confirmadaEn,
        Instant canceladaEn,
        String motivoCancelacion,
        int cuposDisponibles,
        Long version) {

    public RespuestaInscripcionEvento(
            Long idInscripcionEvento,
            Long idEvento,
            String identificadorUrl,
            String tituloEvento,
            String estado,
            Instant iniciaEn,
            String lugar,
            Instant requisitosAceptadosEn,
            Instant confirmadaEn,
            Instant canceladaEn,
            String motivoCancelacion,
            int cuposDisponibles,
            Long version) {
        this(idInscripcionEvento, idEvento, identificadorUrl, tituloEvento, null, null, estado,
                iniciaEn, lugar, requisitosAceptadosEn, confirmadaEn, canceladaEn,
                motivoCancelacion, cuposDisponibles, version);
    }
}
