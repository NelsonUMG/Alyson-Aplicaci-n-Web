package gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.Bicicleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface RepositorioBicicleta extends JpaRepository<Bicicleta, Long> {

    boolean existsByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCaseAndIdBicicletaNot(String codigo, Long idBicicleta);

    @Query("""
            select b from Bicicleta b
            where (:estado = '' or b.estado = :estado)
              and (:busqueda = '' or lower(b.codigo) like lower(concat('%', :busqueda, '%')))
            """)
    @EntityGraph(attributePaths = "actualizadoPor")
    Page<Bicicleta> buscarAdministradas(
            @Param("busqueda") String busqueda,
            @Param("estado") String estado,
            Pageable pagina);

    @Query("select b from Bicicleta b where b.idBicicleta = :idBicicleta")
    @EntityGraph(attributePaths = "actualizadoPor")
    Optional<Bicicleta> buscarAdministradaPorId(@Param("idBicicleta") Long idBicicleta);

    @Query("select b.estado as estado, count(b) as cantidad from Bicicleta b group by b.estado")
    List<ConteoBicicletasPorEstado> contarPorEstado();

    @Query("select max(b.actualizadoEn) from Bicicleta b")
    Instant buscarUltimaActualizacion();
}
