package gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioReservaArea extends JpaRepository<ReservaArea, Long> {

    boolean existsByArea_IdArea(Long idArea);

    @Query("""
            select r from ReservaArea r
            join r.area a
            where a.idArea in :idsArea
              and r.estado in ('PROGRAMADA', 'ENUSO')
              and r.finalizaEn > :ahora
            order by r.iniciaEn, r.finalizaEn, r.idReservaArea
            """)
    @EntityGraph(attributePaths = "area")
    List<ReservaArea> buscarVigentesPorAreas(
            @Param("idsArea") Collection<Long> idsArea,
            @Param("ahora") Instant ahora);

    @Query("""
            select r from ReservaArea r
            where r.area.idArea = :idArea
              and r.finalizaEn >= :desde
              and r.iniciaEn <= :hasta
            order by r.iniciaEn desc, r.idReservaArea desc
            """)
    @EntityGraph(attributePaths = {"area", "actualizadoPor"})
    List<ReservaArea> buscarAdministradasPorArea(
            @Param("idArea") Long idArea,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta);

    @Query("select r from ReservaArea r where r.idReservaArea = :idReservaArea and r.area.idArea = :idArea")
    @EntityGraph(attributePaths = {"area", "actualizadoPor"})
    Optional<ReservaArea> buscarAdministradaPorId(
            @Param("idArea") Long idArea,
            @Param("idReservaArea") Long idReservaArea);

    @Query("""
            select count(r) from ReservaArea r
            where r.area.idArea = :idArea
              and r.estado in ('PROGRAMADA', 'ENUSO')
              and r.iniciaEn < :finalizaEn
              and r.finalizaEn > :iniciaEn
              and (:idReservaArea is null or r.idReservaArea <> :idReservaArea)
            """)
    long contarTraslapesActivos(
            @Param("idArea") Long idArea,
            @Param("iniciaEn") Instant iniciaEn,
            @Param("finalizaEn") Instant finalizaEn,
            @Param("idReservaArea") Long idReservaArea);
}
