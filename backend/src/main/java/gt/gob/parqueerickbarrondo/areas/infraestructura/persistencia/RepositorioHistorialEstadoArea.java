package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.util.List;

import gt.gob.parqueerickbarrondo.areas.dominio.HistorialEstadoArea;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioHistorialEstadoArea extends JpaRepository<HistorialEstadoArea, Long> {

    @EntityGraph(attributePaths = "cambiadoPor")
    List<HistorialEstadoArea> findAllByArea_IdAreaOrderByCambiadoEnDescIdHistorialEstadoAreaDesc(
            Long idArea);
}
