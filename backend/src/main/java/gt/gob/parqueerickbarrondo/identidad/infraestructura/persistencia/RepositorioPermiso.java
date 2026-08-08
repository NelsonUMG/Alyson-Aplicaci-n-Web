package gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia;

import java.util.Collection;
import java.util.List;

import gt.gob.parqueerickbarrondo.identidad.dominio.Permiso;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioPermiso extends JpaRepository<Permiso, Long> {

    List<Permiso> findAllByCodigoIn(Collection<String> codigos);

    List<Permiso> findAllByOrderByCodigoAsc();
}
