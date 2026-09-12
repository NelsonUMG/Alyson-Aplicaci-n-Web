package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import gt.gob.parqueerickbarrondo.identidad.dominio.RegistroPendiente;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface RepositorioRegistroPendiente extends JpaRepository<RegistroPendiente, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RegistroPendiente> findByCorreo(String correo);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RegistroPendiente> findByHashToken(byte[] hashToken);
}
