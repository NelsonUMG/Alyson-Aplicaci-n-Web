package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;

/** Las fotos solo se incluyen en respuestas privadas de inscripciones. Nunca se publican en el catálogo. */
final class FotoParticipante {
    private FotoParticipante() { }
    static boolean esCampoFoto(String tipo, String etiqueta) {
        return "FOTO".equals(tipo) || java.text.Normalizer.normalize(etiqueta, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT)
                .matches(".*\\b(foto|fotografia|fotografias)\\b.*");
    }
    static String validar(String dato) {
        if (dato.length() > 1_400_000 || !(dato.startsWith("data:image/jpeg;base64,") || dato.startsWith("data:image/png;base64,"))) {
            throw invalida();
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(dato.substring(dato.indexOf(',') + 1));
            if (bytes.length > 1_048_576) throw invalida();
            try (var entrada = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var lectores = ImageIO.getImageReaders(entrada);
                if (!lectores.hasNext()) throw invalida();
                var lector = lectores.next();
                try {
                    lector.setInput(entrada);
                    String formato = lector.getFormatName();
                    if (!("JPEG".equalsIgnoreCase(formato) || "PNG".equalsIgnoreCase(formato))
                            || lector.getWidth(0) > 4096 || lector.getHeight(0) > 4096) throw invalida();
                    var imagen = lector.read(0);
                    // Recodificar elimina metadatos y contenido agregado al archivo original.
                    var salida = new ByteArrayOutputStream();
                    String destino = "JPEG".equalsIgnoreCase(formato) ? "jpeg" : "png";
                    if (!ImageIO.write(imagen, destino, salida) || salida.size() > 2_097_152) throw invalida();
                    return "data:image/" + destino + ";base64," + Base64.getEncoder().encodeToString(salida.toByteArray());
                } finally { lector.dispose(); }
            }
        } catch (java.io.IOException | IllegalArgumentException error) { throw invalida(); }
    }
    private static SolicitudInvalidaException invalida() {
        return new SolicitudInvalidaException("La foto debe ser una imagen JPG o PNG de hasta 1 MB y 4096 × 4096 píxeles.");
    }
}
