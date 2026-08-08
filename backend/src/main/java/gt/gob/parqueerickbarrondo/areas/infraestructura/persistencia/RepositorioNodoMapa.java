package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.areas.dominio.NodoMapa;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioNodoMapa extends JpaRepository<NodoMapa, Long> {

    @Query("select n from NodoMapa n order by n.nombre, n.idNodoMapa")
    @EntityGraph(attributePaths = {"area", "area.categoria"})
    List<NodoMapa> buscarTodosAdministrados();

    @Query("select n from NodoMapa n where n.idNodoMapa = :idNodoMapa")
    @EntityGraph(attributePaths = {"area", "area.categoria"})
    Optional<NodoMapa> buscarAdministradoPorId(@Param("idNodoMapa") Long idNodoMapa);

    @Query("""
            select n from NodoMapa n
            left join n.area a
            left join a.categoria c
            where n.coordenadasConfirmadas = true
              and (n.area is null or c.activa = true)
            order by n.nombre, n.idNodoMapa
            """)
    @EntityGraph(attributePaths = {"area", "area.categoria"})
    List<NodoMapa> buscarPublicos();
}
