package gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia;

import java.util.Optional;

import gt.gob.parqueerickbarrondo.eventos.dominio.InscripcionEvento;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioInscripcionEvento extends JpaRepository<InscripcionEvento, Long> {

    @Query("""
            select i from InscripcionEvento i
            where i.evento.idEvento = :idEvento and i.usuario.idUsuario = :idUsuario
            """)
    @EntityGraph(attributePaths = {"evento", "usuario"})
    Optional<InscripcionEvento> buscarPorEventoYUsuario(
            @Param("idEvento") Long idEvento,
            @Param("idUsuario") Long idUsuario);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select i from InscripcionEvento i
            where i.evento.idEvento = :idEvento and i.usuario.idUsuario = :idUsuario
            """)
    @EntityGraph(attributePaths = {"evento", "usuario"})
    Optional<InscripcionEvento> buscarParaActualizar(
            @Param("idEvento") Long idEvento,
            @Param("idUsuario") Long idUsuario);

    @Query("select i from InscripcionEvento i where i.usuario.idUsuario = :idUsuario")
    @EntityGraph(attributePaths = "evento")
    Page<InscripcionEvento> buscarPorUsuario(
            @Param("idUsuario") Long idUsuario,
            Pageable pagina);

    @Query("""
            select i from InscripcionEvento i
            where i.evento.idEvento = :idEvento
              and (:estado = '' or i.estado = :estado)
              and (:busqueda = ''
                   or lower(i.usuario.correoNormalizado) like lower(concat('%', :busqueda, '%'))
                   or lower(i.usuario.nombre) like lower(concat('%', :busqueda, '%'))
                   or lower(i.usuario.apellido) like lower(concat('%', :busqueda, '%')))
            """)
    @EntityGraph(attributePaths = {"evento", "usuario"})
    Page<InscripcionEvento> buscarAdministradas(
            @Param("idEvento") Long idEvento,
            @Param("busqueda") String busqueda,
            @Param("estado") String estado,
            Pageable pagina);
}
