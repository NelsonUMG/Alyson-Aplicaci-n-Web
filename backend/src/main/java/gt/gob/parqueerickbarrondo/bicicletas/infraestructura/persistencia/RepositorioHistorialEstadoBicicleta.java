package gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia;

import java.util.List;

import gt.gob.parqueerickbarrondo.bicicletas.dominio.HistorialEstadoBicicleta;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioHistorialEstadoBicicleta
        extends JpaRepository<HistorialEstadoBicicleta, Long> {

    @EntityGraph(attributePaths = "cambiadoPor")
    List<HistorialEstadoBicicleta>
            findAllByBicicleta_IdBicicletaOrderByCambiadoEnDescIdHistorialEstadoBicicletaDesc(
                    Long idBicicleta);
}
