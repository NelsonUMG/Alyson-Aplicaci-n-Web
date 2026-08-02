package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import gt.gob.parqueerickbarrondo.identidad.dominio.EventoAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioEventoAuditoria extends JpaRepository<EventoAuditoria, Long> {
}
