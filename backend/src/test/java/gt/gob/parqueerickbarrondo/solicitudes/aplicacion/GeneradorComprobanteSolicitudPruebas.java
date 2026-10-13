package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import static org.assertj.core.api.Assertions.*;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.*;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;

class GeneradorComprobanteSolicitudPruebas {
    RespuestaDetalleSolicitud solicitud(String estado, String resolucion) {
        var detalle = new DetalleUsoInstalacionSolicitud("CANCHA1", "Cancha central", LocalDate.of(2026, 12, 1),
                LocalTime.of(9, 0), LocalTime.of(11, 0), "Torneo infantil", 25, "Actividad",
                new DatosSolicitanteSolicitud("Ana", "López", "ana@example.com", null, null, null),
                null, null, null, null, false, null, null, null);
        return new RespuestaDetalleSolicitud(12L, "USOINSTALACION", "Reserva de cancha", estado, detalle,
                List.of(), resolucion, Instant.now(), Instant.now(), Instant.now(), 1L, "Administradora Prueba");
    }
    @Test void pdfIncluyeResponsableLugarHorarioYRespuesta() throws Exception {
        try (var doc = Loader.loadPDF(GeneradorComprobanteSolicitud.generar(solicitud("APROBADA", "Presentarse en recepción.")))) {
            var texto = new PDFTextStripper().getText(doc);
            assertThat(texto).contains("APROBADA", "#12", "Administradora Prueba", "Cancha central", "09:00 a 11:00", "Ana López", "Presentarse en recepción");
            assertThat(doc.getNumberOfPages()).isEqualTo(1);
        }
    }
    @Test void resolucionLargaContinuaEnMasPaginas() throws Exception {
        try (var doc = Loader.loadPDF(GeneradorComprobanteSolicitud.generar(solicitud("APROBADA", "Condición de uso. ".repeat(290))))) {
            assertThat(doc.getNumberOfPages()).isGreaterThan(1);
            assertThat(new PDFTextStripper().getText(doc)).contains("Conserva este comprobante");
        }
    }
    @Test void noEmiteComprobanteDeAprobacionParaUnaRechazada() {
        assertThatThrownBy(() -> GeneradorComprobanteSolicitud.generar(solicitud("RECHAZADA", "No disponible")))
                .isInstanceOf(SolicitudInvalidaException.class);
    }
}
