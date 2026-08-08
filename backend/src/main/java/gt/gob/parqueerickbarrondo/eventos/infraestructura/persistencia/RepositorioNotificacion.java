package gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia;

import gt.gob.parqueerickbarrondo.eventos.dominio.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioNotificacion extends JpaRepository<Notificacion, Long> {
}
