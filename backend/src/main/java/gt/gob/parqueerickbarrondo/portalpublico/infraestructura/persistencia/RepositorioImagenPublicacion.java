package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.ImagenPublicacion;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioImagenPublicacion extends JpaRepository<ImagenPublicacion, Long> {

    List<ImagenPublicacion> findAllByPublicacion_IdPublicacionInOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(
            Collection<Long> identificadoresPublicacion);

    List<ImagenPublicacion> findAllByPublicacion_IdPublicacionOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(
            Long idPublicacion);

    long countByPublicacion_IdPublicacion(Long idPublicacion);

    Optional<ImagenPublicacion> findByIdImagenPublicacionAndPublicacion_IdPublicacion(
            Long idImagenPublicacion,
            Long idPublicacion);

    @Query("""
            select i from ImagenPublicacion i join fetch i.publicacion p join p.categoria c
            where i.idImagenPublicacion = :idImagenPublicacion
              and p.estado = 'PUBLICADA'
              and p.publicadoEn <= :ahora
              and c.activa = true
            """)
    @EntityGraph(attributePaths = "publicacion")
    Optional<ImagenPublicacion> buscarImagenPublica(
            @Param("idImagenPublicacion") Long idImagenPublicacion,
            @Param("ahora") Instant ahora);
}
