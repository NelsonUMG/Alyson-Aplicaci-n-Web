package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleSolicitud;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;

public final class GeneradorComprobanteSolicitud {
    private GeneradorComprobanteSolicitud() { }

    public static byte[] generar(RespuestaDetalleSolicitud solicitud) {
        if (!"APROBADA".equals(solicitud.estado())) {
            throw new SolicitudInvalidaException("El comprobante estará disponible cuando la solicitud sea aprobada.");
        }
        var detalle = solicitud.detalle();
        var fecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.of("America/Guatemala"));
        var lineas = new ArrayList<String>();
        lineas.add("PARQUE ERICK BARRONDO");
        lineas.add("COMPROBANTE DE SOLICITUD APROBADA");
        lineas.add("Número de solicitud: #" + solicitud.idSolicitud());
        lineas.add("Trámite: " + solicitud.nombreTipoSolicitud());
        lineas.add("Estado: APROBADA");
        lineas.add("Fecha de aprobación: " + (solicitud.resueltoEn() == null ? "No registrada" : fecha.format(solicitud.resueltoEn()) + " (Guatemala)"));
        lineas.add("Aprobada por: " + valor(solicitud.resueltoPor(), "No registrado en la resolución original"));
        if (detalle.datosSolicitante() != null) {
            var persona = detalle.datosSolicitante();
            lineas.add("Solicitante: " + valor(persona.nombre(), "") + " " + valor(persona.apellido(), ""));
        }
        lineas.add("Lugar: " + valor(detalle.nombreArea(), valor(detalle.centroDeportivo(), "Ver indicaciones de la resolución")));
        lineas.add("Actividad: " + valor(detalle.tipoActividad(), solicitud.nombreTipoSolicitud()));
        lineas.add("Fecha reservada: " + (detalle.fechaSolicitada() == null ? "No aplica" : detalle.fechaSolicitada().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
        lineas.add("Horario: " + (detalle.horaInicio() == null ? "No aplica" : detalle.horaInicio() + " a " + detalle.horaFin()));
        if (detalle.cantidadPersonas() > 0) lineas.add("Cantidad de personas: " + detalle.cantidadPersonas());
        lineas.add("RESOLUCIÓN");
        lineas.add(valor(solicitud.resolucion(), "Sin observaciones"));
        lineas.add("Conserva este comprobante y presenta el número de solicitud al personal del parque.");
        try (var documento = new PDDocument(); var salida = new ByteArrayOutputStream()) {
            var fuente = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            List<String> renglones = new ArrayList<>();
            for (String linea : lineas) {
                String actual = "";
                for (String palabra : limpiar(linea).split("\\s+")) {
                    // También partir palabras largas para impedir texto fuera de la página.
                    for (int i = 0; i < palabra.length(); i++) {
                        String siguiente = actual + palabra.charAt(i);
                        if (fuente.getStringWidth(siguiente) / 1000 * 11 > 500) {
                            renglones.add(actual); actual = "";
                        }
                        actual += palabra.charAt(i);
                    }
                    actual += " ";
                }
                if (!actual.isBlank()) renglones.add(actual.stripTrailing());
                renglones.add("");
            }
            int paginaNumero = 0;
            for (int inicio = 0; inicio < renglones.size(); inicio += 38) {
                var pagina = new PDPage(PDRectangle.A4); documento.addPage(pagina);
                try (var contenido = new PDPageContentStream(documento, pagina)) {
                    contenido.setNonStrokingColor(0.07f, 0.28f, 0.22f);
                    contenido.addRect(42, 792, 511, 4); contenido.fill();
                    contenido.beginText(); contenido.setFont(fuente, 11); contenido.setLeading(18); contenido.newLineAtOffset(48, 766);
                    for (String linea : renglones.subList(inicio, Math.min(inicio + 38, renglones.size()))) {
                        contenido.showText(linea); contenido.newLine();
                    }
                    contenido.endText();
                    contenido.beginText(); contenido.setFont(fuente, 9); contenido.newLineAtOffset(48, 38);
                    contenido.showText("Solicitud #" + solicitud.idSolicitud() + " | Página " + (++paginaNumero));
                    contenido.endText();
                }
            }
            documento.save(salida); return salida.toByteArray();
        } catch (IOException error) { throw new IllegalStateException("No fue posible generar el comprobante.", error); }
    }
    private static String valor(String texto, String alternativa) { return texto == null || texto.isBlank() ? alternativa : texto; }
    private static String limpiar(String texto) {
        return texto.replaceAll("[^\\x20-\\x7E\\u00A0-\\u00FF]", " ").replace('\u00AD', '-');
    }
}
