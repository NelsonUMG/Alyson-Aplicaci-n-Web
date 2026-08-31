package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.solicitudes.dominio.ResenaTramite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioResenaTramite extends JpaRepository<ResenaTramite, Long> {
    @EntityGraph(attributePaths = "usuario")
    List<ResenaTramite> findTop20ByTramite_IdTramiteOrderByActualizadoEnDescIdResenaTramiteDesc(Long idTramite);
    Optional<ResenaTramite> findByTramite_IdTramiteAndUsuario_IdUsuario(Long idTramite, Long idUsuario);
    long countByTramite_IdTramite(Long idTramite);
}
