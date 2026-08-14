package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.util.Set;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenEvento;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioConsultaImagenEventoPublica {

    private static final Set<String> ESTADOS_PUBLICOS = Set.of(
            "PUBLICADO", "CERRADO", "CANCELADO", "FINALIZADO");

    private final RepositorioEvento repositorioEvento;
    private final RepositorioImagenEvento repositorioImagenEvento;
    private final ServicioAlmacenamientoImagenesEvento servicioAlmacenamiento;

    public ServicioConsultaImagenEventoPublica(
            RepositorioEvento repositorioEvento,
            RepositorioImagenEvento repositorioImagenEvento,
            ServicioAlmacenamientoImagenesEvento servicioAlmacenamiento) {
        this.repositorioEvento = repositorioEvento;
        this.repositorioImagenEvento = repositorioImagenEvento;
        this.servicioAlmacenamiento = servicioAlmacenamiento;
    }

    @Transactional(readOnly = true)
    public ArchivoImagenEvento cargar(String identificadorUrl) {
        var evento = repositorioEvento
                .buscarPublicoPorIdentificadorUrl(identificadorUrl, ESTADOS_PUBLICOS)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el evento solicitado."));
        if (evento.obtenerClaveImagen() == null) {
            throw new RecursoNoEncontradoException("El evento no tiene una imagen registrada.");
        }
        return servicioAlmacenamiento.cargar(evento.obtenerClaveImagen());
    }

    @Transactional(readOnly = true)
    public ArchivoImagenEvento cargarSecundaria(Long idImagenEvento) {
        var imagen = repositorioImagenEvento.buscarImagenPublica(idImagenEvento)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró la imagen secundaria solicitada."));
        return servicioAlmacenamiento.cargar(imagen.obtenerClaveAlmacenamiento());
    }
}
