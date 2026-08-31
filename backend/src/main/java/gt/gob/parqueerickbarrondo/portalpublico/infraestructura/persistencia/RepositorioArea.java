package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RepositorioArea extends JpaRepository<Area, Long> {

    boolean existsByNumeroVisibleMapa(Integer numeroVisibleMapa);

    boolean existsByNumeroVisibleMapaAndIdAreaNot(Integer numeroVisibleMapa, Long idArea);

    @Query("select a.codigo from Area a")
    List<String> findAllCodigos();

    @Query(value = "SELECT COUNT_BIG(*) FROM dbo.SolicitudesMantenimiento WHERE IdArea = :idArea", nativeQuery = true)
    long contarSolicitudesMantenimiento(
            @org.springframework.data.repository.query.Param("idArea") Long idArea);

    @Query("select a from Area a join a.categoria c where c.activa = true and a.claveImagen is not null order by c.nombre, a.nombre")
    @EntityGraph(attributePaths = {"categoria", "perimetro"})
    List<Area> buscarPublicas();

    @Query("""
            select a from Area a
            where (:estado = '' or a.estado = :estado)
              and (:idCategoria is null or a.categoria.idCategoriaArea = :idCategoria)
              and (:busqueda = ''
                   or lower(a.codigo) like lower(concat('%', :busqueda, '%'))
                   or lower(a.nombre) like lower(concat('%', :busqueda, '%')))
            """)
    @EntityGraph(attributePaths = {"categoria", "actualizadoPor"})
    Page<Area> buscarAdministradas(
            @org.springframework.data.repository.query.Param("busqueda") String busqueda,
            @org.springframework.data.repository.query.Param("estado") String estado,
            @org.springframework.data.repository.query.Param("idCategoria") Long idCategoria,
            Pageable pagina);

    @Query("select a from Area a where a.idArea = :idArea")
    @EntityGraph(attributePaths = {"categoria", "actualizadoPor"})
    Optional<Area> buscarAdministradaPorId(
            @org.springframework.data.repository.query.Param("idArea") Long idArea);

    @Query("select a from Area a join a.categoria c where a.codigo = :codigo and c.activa = true")
    Optional<Area> buscarPublicaPorCodigo(
            @org.springframework.data.repository.query.Param("codigo") String codigo);
}
