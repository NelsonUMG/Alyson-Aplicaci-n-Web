package gt.gob.parqueerickbarrondo.portalpublico.api.modelo;

import java.time.Instant;
import java.util.List;

public record RespuestaDetalleEvento(
        Long idEvento,
        String identificadorUrl,
        String titulo,
        String descripcion,
        String lugar,
        Instant iniciaEn,
        Instant finalizaEn,
        Instant inscripcionAbreEn,
        Instant inscripcionCierraEn,
        int capacidadTotal,
        int cuposDisponibles,
        String estado,
        List<RespuestaRequisitoEvento> requisitos,
        String esquemaFormularioJson,
        String configuracionGruposJson,
        String urlImagen,
        List<RespuestaImagenEventoPublica> imagenesSecundarias) {
}
