package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.EventoAuditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioEventoAuditoria extends JpaRepository<EventoAuditoria, Long> {

    @Query("""
            select e from EventoAuditoria e
            where (:accion = '' or e.codigoAccion = :accion)
              and (:tipoRecurso = '' or e.tipoRecurso = :tipoRecurso)
              and (:idRecurso = '' or e.idRecurso = :idRecurso)
              and (:resultado = '' or e.resultado = :resultado)
              and (:idUsuarioActor is null or e.idUsuarioActor = :idUsuarioActor)
              and (:desde is null or e.ocurridoEn >= :desde)
              and (:hasta is null or e.ocurridoEn <= :hasta)
            """)
    Page<EventoAuditoria> buscarPagina(
            @Param("accion") String accion,
            @Param("tipoRecurso") String tipoRecurso,
            @Param("idRecurso") String idRecurso,
            @Param("resultado") String resultado,
            @Param("idUsuarioActor") Long idUsuarioActor,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta,
            Pageable pagina);
}
