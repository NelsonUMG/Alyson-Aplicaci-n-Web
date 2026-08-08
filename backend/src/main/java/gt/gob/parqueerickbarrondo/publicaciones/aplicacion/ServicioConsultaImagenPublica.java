package gt.gob.parqueerickbarrondo.publicaciones.aplicacion;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioConsultaImagenPublica {

    private final RepositorioImagenPublicacion repositorioImagen;
    private final ServicioAlmacenamientoImagenesPublicacion servicioAlmacenamiento;

    public ServicioConsultaImagenPublica(
            RepositorioImagenPublicacion repositorioImagen,
            ServicioAlmacenamientoImagenesPublicacion servicioAlmacenamiento) {
        this.repositorioImagen = repositorioImagen;
        this.servicioAlmacenamiento = servicioAlmacenamiento;
    }

    @Transactional(readOnly = true)
    public ArchivoImagenPublica cargar(Long idImagenPublicacion) {
        var imagen = repositorioImagen.buscarImagenPublica(idImagenPublicacion, Instant.now())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la imagen solicitada."));
        var recurso = servicioAlmacenamiento.cargar(imagen.obtenerClaveAlmacenamiento());
        return new ArchivoImagenPublica(recurso, imagen.obtenerTipoMedio(), imagen.obtenerTamanoBytes());
    }
}
