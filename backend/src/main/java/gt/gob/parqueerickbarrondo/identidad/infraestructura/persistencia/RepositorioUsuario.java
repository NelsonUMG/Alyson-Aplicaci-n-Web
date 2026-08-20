package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface RepositorioUsuario extends JpaRepository<Usuario, Long> {

    boolean existsByCorreoNormalizado(String correoNormalizado);

    boolean existsByDpi(String dpi);

    @EntityGraph(attributePaths = {"roles", "roles.permisos"})
    Optional<Usuario> findByCorreoNormalizado(String correoNormalizado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.correoNormalizado = :correo")
    Optional<Usuario> buscarPorCorreoParaVerificacion(@Param("correo") String correo);

    @Query("select u from Usuario u where u.idUsuario = :idUsuario")
    @EntityGraph(attributePaths = {"roles", "roles.permisos"})
    Optional<Usuario> buscarConPermisosPorId(@Param("idUsuario") Long idUsuario);

    @Query("select distinct u from Usuario u left join fetch u.roles where u.idUsuario in :identificadores")
    List<Usuario> buscarConRolesPorIds(@Param("identificadores") Collection<Long> identificadores);

    @Query("""
            select u from Usuario u
            where :busqueda = ''
               or lower(u.correoNormalizado) like lower(concat('%', :busqueda, '%'))
               or lower(u.nombre) like lower(concat('%', :busqueda, '%'))
               or lower(u.apellido) like lower(concat('%', :busqueda, '%'))
            """)
    Page<Usuario> buscarPagina(@Param("busqueda") String busqueda, Pageable pagina);

    @Query("""
            select count(distinct u) from Usuario u join u.roles r
            where r.codigo = 'ADMINISTRADOR' and u.estado = 'ACTIVO'
            """)
    long contarAdministradoresActivos();
}
