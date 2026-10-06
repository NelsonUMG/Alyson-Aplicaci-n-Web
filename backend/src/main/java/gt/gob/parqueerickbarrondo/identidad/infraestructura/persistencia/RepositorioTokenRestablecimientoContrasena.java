package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;
import gt.gob.parqueerickbarrondo.identidad.dominio.TokenRestablecimientoContrasena;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RepositorioTokenRestablecimientoContrasena extends JpaRepository<TokenRestablecimientoContrasena, Long> {

    void deleteAllByUsuario_IdUsuario(Long idUsuario);
    @Query("select t.usuario.correoNormalizado from TokenRestablecimientoContrasena t where t.hashToken = :hash")
    Optional<String> buscarCorreoPorHash(@Param("hash") byte[] hash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TokenRestablecimientoContrasena t where t.hashToken = :hash")
    Optional<TokenRestablecimientoContrasena> buscarParaConsumir(@Param("hash") byte[] hash);
    List<TokenRestablecimientoContrasena> findAllByUsuario_IdUsuarioAndConsumidoEnIsNull(Long idUsuario);
    Optional<TokenRestablecimientoContrasena> findFirstByUsuario_IdUsuarioOrderByCreadoEnDesc(Long idUsuario);
}
