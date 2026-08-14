package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.util.List;
import java.util.Optional;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.ImagenEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioImagenEvento extends JpaRepository<ImagenEvento, Long> {
    List<ImagenEvento> findAllByEvento_IdEventoOrderByOrdenVisualizacionAscIdImagenEventoAsc(Long idEvento);
    long countByEvento_IdEvento(Long idEvento);
    Optional<ImagenEvento> findTopByEvento_IdEventoOrderByOrdenVisualizacionDescIdImagenEventoDesc(Long idEvento);
    Optional<ImagenEvento> findByIdImagenEventoAndEvento_IdEvento(Long idImagenEvento, Long idEvento);

    @Query("""
            select i from ImagenEvento i join fetch i.evento e
            where i.idImagenEvento = :idImagenEvento
              and e.estado in ('PUBLICADO', 'CERRADO', 'CANCELADO', 'FINALIZADO')
            """)
    Optional<ImagenEvento> buscarImagenPublica(@Param("idImagenEvento") Long idImagenEvento);
}
