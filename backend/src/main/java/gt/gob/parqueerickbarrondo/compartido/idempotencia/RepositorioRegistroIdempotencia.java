package gt.gob.parqueerickbarrondo.compartido.idempotencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositorioRegistroIdempotencia extends JpaRepository<RegistroIdempotencia, Long> {

    Optional<RegistroIdempotencia> findByAlcanceActorAndCodigoOperacionAndHashClaveIdempotencia(
            String alcanceActor,
            String codigoOperacion,
            byte[] hashClaveIdempotencia);
}
