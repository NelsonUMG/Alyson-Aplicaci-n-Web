package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.Instant;
import java.util.List;

public record RespuestaEventoAdministrado(
        Long idEvento,
        String titulo,
        String identificadorUrl,
        String descripcion,
        String lugar,
        Instant iniciaEn,
        Instant finalizaEn,
        Instant inscripcionAbreEn,
        Instant inscripcionCierraEn,
        int capacidadTotal,
        int cantidadOcupada,
        int cuposDisponibles,
        String estado,
        String esquemaFormularioJson,
        String configuracionGruposJson,
        List<RespuestaRequisitoEventoAdministrado> requisitos,
        boolean tieneImagen,
        String urlImagen,
        Instant creadoEn,
        Instant actualizadoEn,
        Long version, boolean cursoContinuo, String urlFormularioInscripcion, String nombreFormularioInscripcion) {
    public RespuestaEventoAdministrado(
        Long idEvento,
        String titulo,
        String identificadorUrl,
        String descripcion,
        String lugar,
        Instant iniciaEn,
        Instant finalizaEn,
        Instant inscripcionAbreEn,
        Instant inscripcionCierraEn,
        int capacidadTotal,
        int cantidadOcupada,
        int cuposDisponibles,
        String estado,
        String esquemaFormularioJson,
        String configuracionGruposJson,
        List<RespuestaRequisitoEventoAdministrado> requisitos,
        boolean tieneImagen,
        String urlImagen,
        Instant creadoEn,
        Instant actualizadoEn,
        Long version) {
        this(idEvento, titulo, identificadorUrl, descripcion, lugar, iniciaEn, finalizaEn, inscripcionAbreEn, inscripcionCierraEn, capacidadTotal, cantidadOcupada, cuposDisponibles, estado, esquemaFormularioJson, configuracionGruposJson, requisitos, tieneImagen, urlImagen, creadoEn, actualizadoEn, version, false, null, null);
    }

}
