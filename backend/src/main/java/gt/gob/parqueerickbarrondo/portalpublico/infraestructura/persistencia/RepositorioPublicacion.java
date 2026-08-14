package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.time.Instant;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.Publicacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioPublicacion extends JpaRepository<Publicacion, Long> {

    @Query(
            value = """
                    select p from Publicacion p join p.categoria c
                    where p.estado = 'PUBLICADA'
                      and p.publicadoEn <= :ahora
                      and c.activa = true
                      and (:categoria = '' or upper(c.codigo) = upper(:categoria))
                      and (:publicadoDesde is null or p.publicadoEn >= :publicadoDesde)
                      and (:publicadoHasta is null or p.publicadoEn < :publicadoHasta)
                      and (:busqueda = ''
                           or lower(p.titulo) like lower(concat('%', :busqueda, '%'))
                           or lower(p.resumen) like lower(concat('%', :busqueda, '%')))
                    """,
            countQuery = """
                    select count(p) from Publicacion p join p.categoria c
                    where p.estado = 'PUBLICADA'
                      and p.publicadoEn <= :ahora
                      and c.activa = true
                      and (:categoria = '' or upper(c.codigo) = upper(:categoria))
                      and (:publicadoDesde is null or p.publicadoEn >= :publicadoDesde)
                      and (:publicadoHasta is null or p.publicadoEn < :publicadoHasta)
                      and (:busqueda = ''
                           or lower(p.titulo) like lower(concat('%', :busqueda, '%'))
                           or lower(p.resumen) like lower(concat('%', :busqueda, '%')))
                    """)
    @EntityGraph(attributePaths = "categoria")
    Page<Publicacion> buscarPublicadas(
            @Param("busqueda") String busqueda,
            @Param("categoria") String categoria,
            @Param("publicadoDesde") Instant publicadoDesde,
            @Param("publicadoHasta") Instant publicadoHasta,
            @Param("ahora") Instant ahora,
            Pageable pagina);

    @Query("""
            select p from Publicacion p join p.categoria c
            where p.identificadorUrl = :identificadorUrl
              and p.estado = 'PUBLICADA'
              and p.publicadoEn <= :ahora
              and c.activa = true
            """)
    @EntityGraph(attributePaths = "categoria")
    Optional<Publicacion> buscarPublicadaPorIdentificadorUrl(
            @Param("identificadorUrl") String identificadorUrl,
            @Param("ahora") Instant ahora);

    @Query(
            value = """
                    select p from Publicacion p join p.categoria c
                    where (:busqueda = ''
                           or lower(p.titulo) like lower(concat('%', :busqueda, '%'))
                           or lower(p.resumen) like lower(concat('%', :busqueda, '%')))
                      and (:estado = '' or p.estado = :estado)
                      and (:idCategoria is null or c.idCategoriaPublicacion = :idCategoria)
                    """,
            countQuery = """
                    select count(p) from Publicacion p join p.categoria c
                    where (:busqueda = ''
                           or lower(p.titulo) like lower(concat('%', :busqueda, '%'))
                           or lower(p.resumen) like lower(concat('%', :busqueda, '%')))
                      and (:estado = '' or p.estado = :estado)
                      and (:idCategoria is null or c.idCategoriaPublicacion = :idCategoria)
                    """)
    @EntityGraph(attributePaths = "categoria")
    Page<Publicacion> buscarAdministradas(
            @Param("busqueda") String busqueda,
            @Param("estado") String estado,
            @Param("idCategoria") Long idCategoria,
            Pageable pagina);

    @Query("select p from Publicacion p where p.idPublicacion = :idPublicacion")
    @EntityGraph(attributePaths = "categoria")
    Optional<Publicacion> buscarAdministradaPorId(@Param("idPublicacion") Long idPublicacion);

    boolean existsByIdentificadorUrl(String identificadorUrl);

    boolean existsByCategoria_IdCategoriaPublicacion(Long idCategoriaPublicacion);
}
