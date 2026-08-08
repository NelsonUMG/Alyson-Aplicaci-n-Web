package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaPublicacion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioCategoriaPublicacion extends JpaRepository<CategoriaPublicacion, Long> {

    List<CategoriaPublicacion> findAllByActivaTrueOrderByOrdenVisualizacionAscNombreAsc();

    List<CategoriaPublicacion> findAllByOrderByOrdenVisualizacionAscNombreAsc();

    Optional<CategoriaPublicacion> findByIdCategoriaPublicacion(Long idCategoriaPublicacion);

    boolean existsByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCaseAndIdCategoriaPublicacionNot(String codigo, Long idCategoriaPublicacion);
}
