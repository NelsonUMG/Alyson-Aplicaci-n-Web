package gt.gob.parqueerickbarrondo.areas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class ServicioAlmacenamientoImagenesAreaPruebas {

    @TempDir
    private java.nio.file.Path carpetaTemporal;

    @Test
    void validaAlmacenaCargaYEliminaUnaImagenReal() throws Exception {
        var servicio = new ServicioAlmacenamientoImagenesArea(carpetaTemporal.toString());
        var salida = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), "png", salida);
        var archivo = new MockMultipartFile("archivo", "area.png", "image/png", salida.toByteArray());

        var almacenada = servicio.guardar(archivo);
        var cargada = servicio.cargar(almacenada.claveAlmacenamiento());

        assertThat(almacenada.claveAlmacenamiento()).startsWith("areas/").endsWith(".png");
        assertThat(cargada.tipoMedio()).isEqualTo("image/png");
        assertThat(cargada.recurso().exists()).isTrue();

        servicio.eliminar(almacenada.claveAlmacenamiento());
        assertThatThrownBy(() -> servicio.cargar(almacenada.claveAlmacenamiento()))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void rechazaUnArchivoQueNoContieneUnaImagenValida() {
        var servicio = new ServicioAlmacenamientoImagenesArea(carpetaTemporal.toString());
        var archivo = new MockMultipartFile(
                "archivo", "aparente.jpg", "image/jpeg", "contenido no válido".getBytes());

        assertThatThrownBy(() -> servicio.guardar(archivo))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("PNG o JPEG");
    }
}
