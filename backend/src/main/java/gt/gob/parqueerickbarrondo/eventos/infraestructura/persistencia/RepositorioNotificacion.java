package gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia;

import gt.gob.parqueerickbarrondo.eventos.dominio.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RepositorioNotificacion extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findTop20ByUsuarioDestinatario_IdUsuarioOrderByCreadoEnDescIdNotificacionDesc(Long idUsuario);
    long countByUsuarioDestinatario_IdUsuarioAndLeidaEnIsNull(Long idUsuario);
    Optional<Notificacion> findByIdNotificacionAndUsuarioDestinatario_IdUsuario(Long idNotificacion, Long idUsuario);
}
