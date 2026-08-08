package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.dominio.EventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioEventoAuditoria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioAuditoria {

    private final RepositorioEventoAuditoria repositorioEventoAuditoria;

    public ServicioAuditoria(RepositorioEventoAuditoria repositorioEventoAuditoria) {
        this.repositorioEventoAuditoria = repositorioEventoAuditoria;
    }

    @Transactional
    public void registrar(
            Long idUsuarioActor,
            String codigoAccion,
            String tipoRecurso,
            String idRecurso,
            String resultado,
            String idCorrelacion) {
        var correlacion = idCorrelacion == null || idCorrelacion.isBlank()
                ? IdentificadorCorrelacion.actual()
                : idCorrelacion;
        repositorioEventoAuditoria.save(new EventoAuditoria(
                idUsuarioActor,
                codigoAccion,
                tipoRecurso,
                idRecurso,
                resultado,
                correlacion));
    }
}
