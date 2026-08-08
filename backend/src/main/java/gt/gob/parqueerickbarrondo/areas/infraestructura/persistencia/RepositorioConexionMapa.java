package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.areas.dominio.ConexionMapa;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioConexionMapa extends JpaRepository<ConexionMapa, Long> {

    @Query("select c from ConexionMapa c order by c.idConexionMapa")
    @EntityGraph(attributePaths = {
        "nodoOrigen", "nodoOrigen.area", "nodoOrigen.area.categoria",
        "nodoDestino", "nodoDestino.area", "nodoDestino.area.categoria"
    })
    List<ConexionMapa> buscarTodas();

    @Query("select c from ConexionMapa c where c.idConexionMapa = :idConexionMapa")
    @EntityGraph(attributePaths = {"nodoOrigen", "nodoDestino"})
    Optional<ConexionMapa> buscarPorId(@Param("idConexionMapa") Long idConexionMapa);

    boolean existsByNodoOrigen_IdNodoMapaAndNodoDestino_IdNodoMapa(Long idOrigen, Long idDestino);

    boolean existsByNodoOrigen_IdNodoMapaAndNodoDestino_IdNodoMapaAndIdConexionMapaNot(
            Long idOrigen,
            Long idDestino,
            Long idConexionMapa);

    @Query("""
            select count(c) from ConexionMapa c
            where c.nodoOrigen.idNodoMapa = :idNodoMapa or c.nodoDestino.idNodoMapa = :idNodoMapa
            """)
    long contarPorNodo(@Param("idNodoMapa") Long idNodoMapa);
}
