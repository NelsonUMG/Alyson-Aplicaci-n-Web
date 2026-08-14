package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaPublicacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RepositorioCategoriaPublicacion extends JpaRepository<CategoriaPublicacion, Long> {

    List<CategoriaPublicacion> findAllByActivaTrueOrderByOrdenVisualizacionAscNombreAsc();

    List<CategoriaPublicacion> findAllByOrderByOrdenVisualizacionAscNombreAsc();

    Optional<CategoriaPublicacion> findByIdCategoriaPublicacion(Long idCategoriaPublicacion);

    @Query("select c.codigo from CategoriaPublicacion c")
    List<String> findAllCodigos();

    boolean existsByOrdenVisualizacion(Short ordenVisualizacion);

    boolean existsByOrdenVisualizacionAndIdCategoriaPublicacionNot(
            Short ordenVisualizacion,
            Long idCategoriaPublicacion);

}
