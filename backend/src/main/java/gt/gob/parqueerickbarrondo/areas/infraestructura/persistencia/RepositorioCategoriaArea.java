package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaArea;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioCategoriaArea extends JpaRepository<CategoriaArea, Long> {

    List<CategoriaArea> findAllByOrderByNombreAsc();

    Optional<CategoriaArea> findByIdCategoriaArea(Long idCategoriaArea);

    boolean existsByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCaseAndIdCategoriaAreaNot(String codigo, Long idCategoriaArea);
}
