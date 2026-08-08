package gt.gob.parqueerickbarrondo.areas.aplicacion;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioConsultaImagenAreaPublica {

    private final RepositorioArea repositorioArea;
    private final ServicioAlmacenamientoImagenesArea servicioAlmacenamiento;

    public ServicioConsultaImagenAreaPublica(
            RepositorioArea repositorioArea,
            ServicioAlmacenamientoImagenesArea servicioAlmacenamiento) {
        this.repositorioArea = repositorioArea;
        this.servicioAlmacenamiento = servicioAlmacenamiento;
    }

    @Transactional(readOnly = true)
    public ArchivoImagenArea cargar(String codigo) {
        var area = repositorioArea.buscarPublicaPorCodigo(codigo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el área solicitada."));
        if (area.obtenerClaveImagen() == null) {
            throw new RecursoNoEncontradoException("El área no tiene una imagen registrada.");
        }
        return servicioAlmacenamiento.cargar(area.obtenerClaveImagen());
    }
}
