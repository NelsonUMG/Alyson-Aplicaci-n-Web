package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

import javax.imageio.ImageIO;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioAlmacenamientoImagenesEvento {

    private static final long TAMANO_MAXIMO = 5L * 1024L * 1024L;
    private static final int DIMENSION_MAXIMA = 8000;

    private final Path rutaRaiz;

    public ServicioAlmacenamientoImagenesEvento(
            @Value("${almacenamiento.eventos.ruta}") String rutaConfigurada) {
        rutaRaiz = Path.of(rutaConfigurada).toAbsolutePath().normalize();
    }

    public ImagenEventoAlmacenada guardar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new SolicitudInvalidaException("La imagen es obligatoria.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new SolicitudInvalidaException("La imagen no puede superar 5 MB.");
        }

        try {
            var bytes = archivo.getBytes();
            var tipo = detectarTipo(bytes);
            var nombreOriginal = normalizarNombreOriginal(archivo.getOriginalFilename());
            validarExtension(nombreOriginal, tipo.extension());
            validarDimensiones(bytes);
            var clave = "eventos/" + UUID.randomUUID() + "." + tipo.extension();
            var destino = resolverRutaSegura(clave);
            Files.createDirectories(destino.getParent());
            var temporal = Files.createTempFile(destino.getParent(), "imagen-", ".temporal");
            try {
                Files.write(temporal, bytes, StandardOpenOption.TRUNCATE_EXISTING);
                mover(temporal, destino);
            } finally {
                Files.deleteIfExists(temporal);
            }
            return new ImagenEventoAlmacenada(clave);
        } catch (SolicitudInvalidaException excepcion) {
            throw excepcion;
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No fue posible validar o almacenar la imagen.");
        }
    }

    public ArchivoImagenEvento cargar(String claveAlmacenamiento) {
        var ruta = resolverRutaSegura(claveAlmacenamiento);
        if (!Files.isRegularFile(ruta)) {
            throw new RecursoNoEncontradoException("No se encontró la imagen solicitada.");
        }
        try {
            var tipoMedio = claveAlmacenamiento.toLowerCase(Locale.ROOT).endsWith(".png")
                    ? "image/png"
                    : "image/jpeg";
            return new ArchivoImagenEvento(new FileSystemResource(ruta), tipoMedio, Files.size(ruta));
        } catch (IOException excepcion) {
            throw new RecursoNoEncontradoException("No se encontró la imagen solicitada.");
        }
    }

    public void eliminar(String claveAlmacenamiento) {
        if (claveAlmacenamiento == null || claveAlmacenamiento.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(resolverRutaSegura(claveAlmacenamiento));
        } catch (IOException excepcion) {
            throw new IllegalStateException("No fue posible eliminar el archivo de imagen.", excepcion);
        }
    }

    private TipoImagen detectarTipo(byte[] bytes) {
        if (bytes.length >= 8
                && (bytes[0] & 0xff) == 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4e
                && bytes[3] == 0x47
                && bytes[4] == 0x0d
                && bytes[5] == 0x0a
                && bytes[6] == 0x1a
                && bytes[7] == 0x0a) {
            return new TipoImagen("png");
        }
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return new TipoImagen("jpg");
        }
        throw new SolicitudInvalidaException("Solo se permiten imágenes PNG o JPEG válidas.");
    }

    private void validarDimensiones(byte[] bytes) throws IOException {
        try (var entrada = new ByteArrayInputStream(bytes)) {
            BufferedImage imagen = ImageIO.read(entrada);
            if (imagen == null || imagen.getWidth() <= 0 || imagen.getHeight() <= 0) {
                throw new SolicitudInvalidaException("El archivo no contiene una imagen válida.");
            }
            if (imagen.getWidth() > DIMENSION_MAXIMA || imagen.getHeight() > DIMENSION_MAXIMA) {
                throw new SolicitudInvalidaException("La imagen no puede superar 8000 píxeles por lado.");
            }
        }
    }

    private String normalizarNombreOriginal(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new SolicitudInvalidaException("La imagen debe incluir un nombre de archivo.");
        }
        var normalizado = nombre.replace('\\', '/');
        normalizado = normalizado.substring(normalizado.lastIndexOf('/') + 1).strip();
        if (normalizado.isBlank() || normalizado.length() > 255) {
            throw new SolicitudInvalidaException("El nombre del archivo no es válido.");
        }
        return normalizado;
    }

    private void validarExtension(String nombre, String extensionDetectada) {
        var nombreMinusculas = nombre.toLowerCase(Locale.ROOT);
        var coincide = "png".equals(extensionDetectada)
                ? nombreMinusculas.endsWith(".png")
                : nombreMinusculas.endsWith(".jpg") || nombreMinusculas.endsWith(".jpeg");
        if (!coincide) {
            throw new SolicitudInvalidaException(
                    "La extensión del archivo no coincide con el contenido de la imagen.");
        }
    }

    private Path resolverRutaSegura(String clave) {
        if (clave == null || clave.isBlank()) {
            throw new RecursoNoEncontradoException("No se encontró la imagen solicitada.");
        }
        var ruta = rutaRaiz.resolve(clave.replace('/', java.io.File.separatorChar)).normalize();
        if (!ruta.startsWith(rutaRaiz)) {
            throw new RecursoNoEncontradoException("No se encontró la imagen solicitada.");
        }
        return ruta;
    }

    private void mover(Path origen, Path destino) throws IOException {
        try {
            Files.move(origen, destino, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException excepcion) {
            Files.move(origen, destino);
        }
    }

    private record TipoImagen(String extension) {
    }
}
