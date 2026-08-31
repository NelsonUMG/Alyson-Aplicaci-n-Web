package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.solicitudes.dominio.Tramite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioTramite extends JpaRepository<Tramite, Long> {
    @EntityGraph(attributePaths = "categoria")
    List<Tramite> findAllByActivoTrueAndCategoria_ActivaTrueOrderByCategoria_OrdenVisualizacionAscNombreAsc();

    @EntityGraph(attributePaths = "categoria")
    List<Tramite> findAllByOrderByCategoria_OrdenVisualizacionAscNombreAsc();

    @EntityGraph(attributePaths = "categoria")
    Optional<Tramite> findByCodigoAndActivoTrueAndCategoria_ActivaTrue(String codigo);

    @EntityGraph(attributePaths = "categoria")
    Optional<Tramite> findByIdTramite(Long idTramite);

    boolean existsByCodigo(String codigo);
}
