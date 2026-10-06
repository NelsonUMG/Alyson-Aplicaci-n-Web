package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class ServicioAlmacenamientoDocumentosSolicitudPruebas {

    @TempDir
    Path temporal;

    @Test
    void rechazaUnEncabezadoPdfSinDocumentoReal() {
        var servicio = new ServicioAlmacenamientoDocumentosSolicitud(temporal.toString());
        var archivo = new MockMultipartFile(
                "archivo", "documento.pdf", "application/pdf", "%PDF-".getBytes());

        assertThatThrownBy(() -> servicio.guardarPdf(archivo))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("dañado o incompleto");
    }

    @Test
    void almacenaUnPdfRealConUnaPagina() throws Exception {
        byte[] bytes;
        try (var documento = new PDDocument(); var salida = new ByteArrayOutputStream()) {
            documento.addPage(new PDPage());
            documento.save(salida);
            bytes = salida.toByteArray();
        }
        var servicio = new ServicioAlmacenamientoDocumentosSolicitud(temporal.toString());
        var archivo = new MockMultipartFile(
                "archivo", "documento.pdf", "application/pdf", bytes);

        var guardado = servicio.guardarPdf(archivo);

        assertThat(guardado.tipoMedio()).isEqualTo("application/pdf");
        assertThat(Files.isRegularFile(
                temporal.resolve(guardado.claveAlmacenamiento().replace('/', java.io.File.separatorChar))))
                .isTrue();
    }

    @Test
    void rechazaUnaImagenConFirmaValidaPeroContenidoTruncado() {
        var servicio = new ServicioAlmacenamientoDocumentosSolicitud(temporal.toString());
        var archivo = new MockMultipartFile(
                "archivo", "imagen.png", "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});

        assertThatThrownBy(() -> servicio.guardar(archivo))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("dañada o incompleta");
    }
}
