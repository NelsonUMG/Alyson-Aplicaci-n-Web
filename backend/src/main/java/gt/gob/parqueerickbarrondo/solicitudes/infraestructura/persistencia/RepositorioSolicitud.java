package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia;

import java.util.Collection;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.solicitudes.dominio.Solicitud;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioSolicitud extends JpaRepository<Solicitud, Long> {

    Page<Solicitud> findAllByUsuarioSolicitante_IdUsuarioAndEstadoIn(
            Long idUsuario,
            Collection<String> estados,
            Pageable pagina);

    long countByUsuarioSolicitante_IdUsuarioAndEstadoIn(Long idUsuario, Collection<String> estados);

    @EntityGraph(attributePaths = "usuarioSolicitante")
    Optional<Solicitud> findByIdSolicitudAndUsuarioSolicitante_IdUsuario(Long idSolicitud, Long idUsuario);

    @EntityGraph(attributePaths = "usuarioSolicitante")
    @Query("select s from Solicitud s where s.idSolicitud = :idSolicitud")
    Optional<Solicitud> buscarAdministradaPorId(@Param("idSolicitud") Long idSolicitud);

    @EntityGraph(attributePaths = "usuarioSolicitante")
    @Query("""
            select s from Solicitud s
            where s.estado <> 'BORRADOR'
              and (:estado = '' or s.estado = :estado)
              and (:busqueda = ''
                   or lower(s.usuarioSolicitante.nombre) like lower(concat('%', :busqueda, '%'))
                   or lower(s.usuarioSolicitante.apellido) like lower(concat('%', :busqueda, '%'))
                   or lower(s.usuarioSolicitante.correoNormalizado) like lower(concat('%', :busqueda, '%')))
            """)
    Page<Solicitud> buscarAdministradas(
            @Param("busqueda") String busqueda,
            @Param("estado") String estado,
            Pageable pagina);
}
