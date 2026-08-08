package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioEvento extends JpaRepository<Evento, Long> {

    boolean existsByIdentificadorUrl(String identificadorUrl);

    @Query("""
            select e from Evento e
            where (:estado = '' or e.estado = :estado)
              and (:busqueda = ''
                   or lower(e.titulo) like lower(concat('%', :busqueda, '%'))
                   or lower(coalesce(e.lugar, '')) like lower(concat('%', :busqueda, '%')))
            """)
    Page<Evento> buscarAdministrados(
            @Param("busqueda") String busqueda,
            @Param("estado") String estado,
            Pageable pagina);

    @Query("select e from Evento e where e.idEvento = :idEvento")
    @EntityGraph(attributePaths = "requisitos")
    Optional<Evento> buscarAdministradoPorId(@Param("idEvento") Long idEvento);

    @Query("""
            select e from Evento e
            where e.estado in :estados
              and coalesce(e.finalizaEn, e.iniciaEn) >= :ahora
            """)
    Page<Evento> buscarAgendaPublica(
            @Param("estados") Set<String> estados,
            @Param("ahora") Instant ahora,
            Pageable pagina);

    @Query("""
            select e from Evento e
            where e.identificadorUrl = :identificadorUrl
              and e.estado in :estados
            """)
    @EntityGraph(attributePaths = "requisitos")
    Optional<Evento> buscarPublicoPorIdentificadorUrl(
            @Param("identificadorUrl") String identificadorUrl,
            @Param("estados") Set<String> estados);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Evento e
               set e.cantidadOcupada = e.cantidadOcupada + 1,
                   e.actualizadoEn = :ahora,
                   e.version = e.version + 1
             where e.idEvento = :idEvento
               and e.estado = 'PUBLICADO'
               and e.cantidadOcupada < e.capacidadTotal
               and (e.inscripcionAbreEn is null or e.inscripcionAbreEn <= :ahora)
               and (e.inscripcionCierraEn is null or e.inscripcionCierraEn >= :ahora)
               and e.iniciaEn > :ahora
            """)
    int reservarCupo(@Param("idEvento") Long idEvento, @Param("ahora") Instant ahora);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Evento e
               set e.cantidadOcupada = e.cantidadOcupada - 1,
                   e.actualizadoEn = :ahora,
                   e.version = e.version + 1
             where e.idEvento = :idEvento
               and e.cantidadOcupada > 0
            """)
    int liberarCupo(@Param("idEvento") Long idEvento, @Param("ahora") Instant ahora);
}
