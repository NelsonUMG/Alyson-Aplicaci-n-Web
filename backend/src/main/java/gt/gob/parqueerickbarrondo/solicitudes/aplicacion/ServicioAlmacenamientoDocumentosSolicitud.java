package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioAlmacenamientoDocumentosSolicitud {

    private static final long TAMANO_MAXIMO = 20L * 1024L * 1024L;
    private final Path rutaRaiz;

    public ServicioAlmacenamientoDocumentosSolicitud(
            @Value("${almacenamiento.solicitudes.ruta}") String rutaConfigurada) {
        rutaRaiz = Path.of(rutaConfigurada).toAbsolutePath().normalize();
    }

    public DocumentoSolicitudAlmacenado guardar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new SolicitudInvalidaException("Selecciona un documento para adjuntar.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new SolicitudInvalidaException("El documento no puede superar 20 MB.");
        }
        try {
            var bytes = archivo.getBytes();
            var tipo = detectarTipo(bytes);
            var nombre = normalizarNombre(archivo.getOriginalFilename());
            validarExtension(nombre, tipo.extension());
            var clave = "solicitudes/" + UUID.randomUUID() + "." + tipo.extension();
            var destino = resolverRutaSegura(clave);
            Files.createDirectories(destino.getParent());
            var temporal = Files.createTempFile(destino.getParent(), "documento-", ".temporal");
            try {
                Files.write(temporal, bytes, StandardOpenOption.TRUNCATE_EXISTING);
                mover(temporal, destino);
            } finally {
                Files.deleteIfExists(temporal);
            }
            return new DocumentoSolicitudAlmacenado(clave, nombre, tipo.tipoMedio(), bytes.length);
        } catch (SolicitudInvalidaException excepcion) {
            throw excepcion;
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No fue posible validar o almacenar el documento.");
        }
    }

    public DocumentoSolicitudAlmacenado guardarPdf(MultipartFile archivo) {
        var guardado = guardar(archivo);
        if (!"application/pdf".equals(guardado.tipoMedio())) {
            eliminar(guardado.claveAlmacenamiento());
            throw new SolicitudInvalidaException("Este paso solo admite documentos PDF válidos.");
        }
        return guardado;
    }

    public ArchivoDocumentoSolicitud cargar(
            String claveAlmacenamiento,
            String tipoMedio,
            String nombreArchivo) {
        var ruta = resolverRutaSegura(claveAlmacenamiento);
        if (!Files.isRegularFile(ruta)) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
        }
        try {
            return new ArchivoDocumentoSolicitud(
                    new FileSystemResource(ruta), tipoMedio, Files.size(ruta), nombreArchivo);
        } catch (IOException excepcion) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
        }
    }

    public void eliminar(String claveAlmacenamiento) {
        try {
            Files.deleteIfExists(resolverRutaSegura(claveAlmacenamiento));
        } catch (IOException excepcion) {
            throw new IllegalStateException("No fue posible eliminar el documento.", excepcion);
        }
    }

    private TipoDocumento detectarTipo(byte[] bytes) {
        if (bytes.length >= 5
                && bytes[0] == '%'
                && bytes[1] == 'P'
                && bytes[2] == 'D'
                && bytes[3] == 'F'
                && bytes[4] == '-') {
            return new TipoDocumento("pdf", "application/pdf");
        }
        if (bytes.length >= 8
                && (bytes[0] & 0xff) == 0x89
                && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47
                && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return new TipoDocumento("png", "image/png");
        }
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return new TipoDocumento("jpg", "image/jpeg");
        }
        throw new SolicitudInvalidaException("Solo se permiten archivos PDF, PNG o JPEG válidos.");
    }

    private String normalizarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new SolicitudInvalidaException("El documento debe incluir un nombre de archivo.");
        }
        var normalizado = nombre.replace('\\', '/');
        normalizado = normalizado.substring(normalizado.lastIndexOf('/') + 1).strip();
        if (normalizado.isBlank() || normalizado.length() > 255) {
            throw new SolicitudInvalidaException("El nombre del documento no es válido.");
        }
        return normalizado;
    }

    private void validarExtension(String nombre, String extension) {
        var minusculas = nombre.toLowerCase(Locale.ROOT);
        var valida = switch (extension) {
            case "pdf" -> minusculas.endsWith(".pdf");
            case "png" -> minusculas.endsWith(".png");
            default -> minusculas.endsWith(".jpg") || minusculas.endsWith(".jpeg");
        };
        if (!valida) {
            throw new SolicitudInvalidaException(
                    "La extensión del documento no coincide con su contenido.");
        }
    }

    private Path resolverRutaSegura(String clave) {
        if (clave == null || clave.isBlank()) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
        }
        var ruta = rutaRaiz.resolve(clave.replace('/', java.io.File.separatorChar)).normalize();
        if (!ruta.startsWith(rutaRaiz)) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
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

    private record TipoDocumento(String extension, String tipoMedio) {
    }
}
