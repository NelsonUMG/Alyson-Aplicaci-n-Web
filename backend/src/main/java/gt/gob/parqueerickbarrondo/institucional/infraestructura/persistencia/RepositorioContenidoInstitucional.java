package gt.gob.parqueerickbarrondo.institucional.infraestructura.persistencia;

import gt.gob.parqueerickbarrondo.institucional.dominio.ContenidoInstitucional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioContenidoInstitucional extends JpaRepository<ContenidoInstitucional, Long> {
}
