package gt.gob.parqueerickbarrondo.identidad.aplicacion;

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

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioAlmacenamientoFotosPerfil {

    private static final long TAMANO_MAXIMO = 5L * 1024L * 1024L;
    private static final int DIMENSION_MAXIMA = 8000;

    private final Path rutaRaiz;

    public ServicioAlmacenamientoFotosPerfil(@Value("${almacenamiento.perfiles.ruta}") String rutaConfigurada) {
        rutaRaiz = Path.of(rutaConfigurada).toAbsolutePath().normalize();
    }

    public String guardar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new SolicitudInvalidaException("Selecciona una fotografía para continuar.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new SolicitudInvalidaException("La fotografía no puede superar 5 MB.");
        }

        try {
            var bytes = archivo.getBytes();
            var extension = detectarTipo(bytes);
            validarExtension(archivo.getOriginalFilename(), extension);
            validarDimensiones(bytes);
            var clave = "perfiles/" + UUID.randomUUID() + "." + extension;
            var destino = resolverRutaSegura(clave);
            Files.createDirectories(destino.getParent());
            var temporal = Files.createTempFile(destino.getParent(), "foto-perfil-", ".temporal");
            try {
                Files.write(temporal, bytes, StandardOpenOption.TRUNCATE_EXISTING);
                mover(temporal, destino);
            } finally {
                Files.deleteIfExists(temporal);
            }
            return clave;
        } catch (SolicitudInvalidaException excepcion) {
            throw excepcion;
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No fue posible validar o almacenar la fotografía.");
        }
    }

    public ArchivoFotoPerfil cargar(String clave) {
        var ruta = resolverRutaSegura(clave);
        if (!Files.isRegularFile(ruta)) {
            throw new RecursoNoEncontradoException("No se encontró la fotografía del perfil.");
        }
        try {
            var tipoMedio = clave.toLowerCase(Locale.ROOT).endsWith(".png") ? "image/png" : "image/jpeg";
            return new ArchivoFotoPerfil(new FileSystemResource(ruta), tipoMedio, Files.size(ruta));
        } catch (IOException excepcion) {
            throw new RecursoNoEncontradoException("No se encontró la fotografía del perfil.");
        }
    }

    public void eliminar(String clave) {
        if (clave == null || clave.isBlank()) return;
        try {
            Files.deleteIfExists(resolverRutaSegura(clave));
        } catch (IOException excepcion) {
            throw new IllegalStateException("No fue posible eliminar la fotografía anterior.", excepcion);
        }
    }

    private String detectarTipo(byte[] bytes) {
        if (bytes.length >= 8
                && (bytes[0] & 0xff) == 0x89
                && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47
                && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return "png";
        }
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return "jpg";
        }
        throw new SolicitudInvalidaException("Solo se permiten fotografías PNG o JPEG válidas.");
    }

    private void validarExtension(String nombreOriginal, String extension) {
        if (nombreOriginal == null || nombreOriginal.isBlank()) {
            throw new SolicitudInvalidaException("La fotografía debe incluir un nombre de archivo.");
        }
        var nombre = nombreOriginal.replace('\\', '/');
        nombre = nombre.substring(nombre.lastIndexOf('/') + 1).strip().toLowerCase(Locale.ROOT);
        if (nombre.isBlank() || nombre.length() > 255) {
            throw new SolicitudInvalidaException("El nombre del archivo no es válido.");
        }
        var coincide = "png".equals(extension)
                ? nombre.endsWith(".png")
                : nombre.endsWith(".jpg") || nombre.endsWith(".jpeg");
        if (!coincide) {
            throw new SolicitudInvalidaException("La extensión no coincide con el contenido de la fotografía.");
        }
    }

    private void validarDimensiones(byte[] bytes) throws IOException {
        try (var entrada = new ByteArrayInputStream(bytes)) {
            BufferedImage imagen = ImageIO.read(entrada);
            if (imagen == null || imagen.getWidth() <= 0 || imagen.getHeight() <= 0) {
                throw new SolicitudInvalidaException("El archivo no contiene una fotografía válida.");
            }
            if (imagen.getWidth() > DIMENSION_MAXIMA || imagen.getHeight() > DIMENSION_MAXIMA) {
                throw new SolicitudInvalidaException("La fotografía no puede superar 8000 píxeles por lado.");
            }
        }
    }

    private Path resolverRutaSegura(String clave) {
        if (clave == null || clave.isBlank()) {
            throw new RecursoNoEncontradoException("No se encontró la fotografía del perfil.");
        }
        var ruta = rutaRaiz.resolve(clave.replace('/', java.io.File.separatorChar)).normalize();
        if (!ruta.startsWith(rutaRaiz)) {
            throw new RecursoNoEncontradoException("No se encontró la fotografía del perfil.");
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
}
