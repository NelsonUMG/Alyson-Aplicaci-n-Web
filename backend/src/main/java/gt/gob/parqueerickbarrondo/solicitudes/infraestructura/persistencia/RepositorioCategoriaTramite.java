package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.solicitudes.dominio.CategoriaTramite;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioCategoriaTramite extends JpaRepository<CategoriaTramite, Long> {
    List<CategoriaTramite> findAllByOrderByOrdenVisualizacionAscNombreAsc();
    Optional<CategoriaTramite> findByIdCategoriaTramiteAndActivaTrue(Long idCategoriaTramite);
    boolean existsByCodigo(String codigo);
}
