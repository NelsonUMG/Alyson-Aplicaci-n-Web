package gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia;

import gt.gob.parqueerickbarrondo.solicitudes.dominio.Documento;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioDocumento extends JpaRepository<Documento, Long> {
}
