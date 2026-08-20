package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.identidad.dominio.TokenVerificacionCorreo;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface RepositorioTokenVerificacionCorreo extends JpaRepository<TokenVerificacionCorreo, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TokenVerificacionCorreo> findByHashToken(byte[] hashToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<TokenVerificacionCorreo> findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(Long idUsuario);

    Optional<TokenVerificacionCorreo> findFirstByUsuario_IdUsuarioOrderByCreadoEnDesc(Long idUsuario);
}
