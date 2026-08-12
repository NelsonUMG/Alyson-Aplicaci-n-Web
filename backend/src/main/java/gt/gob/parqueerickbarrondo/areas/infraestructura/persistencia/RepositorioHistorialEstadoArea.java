package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.util.List;

import gt.gob.parqueerickbarrondo.areas.dominio.HistorialEstadoArea;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioHistorialEstadoArea extends JpaRepository<HistorialEstadoArea, Long> {

    @EntityGraph(attributePaths = "cambiadoPor")
    List<HistorialEstadoArea> findAllByArea_IdAreaOrderByCambiadoEnDescIdHistorialEstadoAreaDesc(
            Long idArea);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM HistorialEstadoArea historial WHERE historial.area.idArea = :idArea")
    int eliminarTodosPorIdArea(@Param("idArea") Long idArea);
}
