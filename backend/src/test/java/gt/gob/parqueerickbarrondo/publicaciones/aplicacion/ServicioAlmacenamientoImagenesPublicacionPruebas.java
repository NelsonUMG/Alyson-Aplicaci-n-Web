package gt.gob.parqueerickbarrondo.publicaciones.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class ServicioAlmacenamientoImagenesPublicacionPruebas {

    @TempDir
    private java.nio.file.Path carpetaTemporal;

    @Test
    void validaYAlmacenaUnaImagenPngConNombreGenerado() throws Exception {
        var servicio = new ServicioAlmacenamientoImagenesPublicacion(carpetaTemporal.toString());
        var salida = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), "png", salida);
        var archivo = new MockMultipartFile("archivo", "parque.png", "image/png", salida.toByteArray());

        var almacenada = servicio.guardar(archivo);

        assertThat(almacenada.nombreArchivoOriginal()).isEqualTo("parque.png");
        assertThat(almacenada.tipoMedio()).isEqualTo("image/png");
        assertThat(almacenada.anchoPixeles()).isEqualTo(2);
        assertThat(almacenada.altoPixeles()).isEqualTo(3);
        assertThat(servicio.cargar(almacenada.claveAlmacenamiento()).exists()).isTrue();

        servicio.eliminar(almacenada.claveAlmacenamiento());
        assertThatThrownBy(() -> servicio.cargar(almacenada.claveAlmacenamiento()))
                .isInstanceOf(gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException.class);
    }

    @Test
    void rechazaUnArchivoQueSoloDeclaraSerImagen() {
        var servicio = new ServicioAlmacenamientoImagenesPublicacion(carpetaTemporal.toString());
        var archivo = new MockMultipartFile(
                "archivo", "aparente.png", "image/png", "contenido no válido".getBytes());

        assertThatThrownBy(() -> servicio.guardar(archivo))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("PNG o JPEG");
    }
}
