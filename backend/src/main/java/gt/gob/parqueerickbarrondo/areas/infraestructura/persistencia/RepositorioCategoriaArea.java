package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RepositorioCategoriaArea extends JpaRepository<CategoriaArea, Long> {

    List<CategoriaArea> findAllByOrderByNombreAsc();

    Optional<CategoriaArea> findByIdCategoriaArea(Long idCategoriaArea);

    @Query("select c.codigo from CategoriaArea c")
    List<String> findAllCodigos();
}
