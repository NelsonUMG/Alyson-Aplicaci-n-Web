package gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia;

import java.util.Collection;
import java.util.List;

import gt.gob.parqueerickbarrondo.bicicletas.dominio.PrestamoBicicleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioPrestamoBicicleta extends JpaRepository<PrestamoBicicleta, Long> {

    boolean existsByBicicleta_IdBicicletaAndEstado(Long idBicicleta, String estado);

    @Query("""
            select p.bicicleta.idBicicleta from PrestamoBicicleta p
            where p.estado = 'ACTIVO' and p.bicicleta.idBicicleta in :identificadores
            """)
    List<Long> buscarIdentificadoresConPrestamoActivo(
            @Param("identificadores") Collection<Long> identificadores);
}
