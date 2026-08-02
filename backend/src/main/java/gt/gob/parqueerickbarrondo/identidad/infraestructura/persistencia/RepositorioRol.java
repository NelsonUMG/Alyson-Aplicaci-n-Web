package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.identidad.dominio.Rol;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioRol extends JpaRepository<Rol, Long> {

    @EntityGraph(attributePaths = "permisos")
    Optional<Rol> findByCodigo(String codigo);

    @EntityGraph(attributePaths = "permisos")
    List<Rol> findAllByCodigoInAndActivoTrue(Collection<String> codigos);

    @EntityGraph(attributePaths = "permisos")
    List<Rol> findAllByActivoTrueOrderByNombreAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Rol r where r.codigo = :codigo")
    Optional<Rol> bloquearPorCodigo(@Param("codigo") String codigo);
}
