package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.solicitudes.dominio.SolicitudDocumento;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioSolicitudDocumento extends JpaRepository<SolicitudDocumento, Long> {

    @EntityGraph(attributePaths = "documento")
    List<SolicitudDocumento> findAllBySolicitud_IdSolicitudOrderByCreadoEnAscIdSolicitudDocumentoAsc(
            Long idSolicitud);

    @EntityGraph(attributePaths = {"documento", "solicitud", "solicitud.usuarioSolicitante"})
    Optional<SolicitudDocumento> findByIdSolicitudDocumentoAndSolicitud_IdSolicitud(
            Long idSolicitudDocumento,
            Long idSolicitud);

    long countBySolicitud_IdSolicitud(Long idSolicitud);
}
