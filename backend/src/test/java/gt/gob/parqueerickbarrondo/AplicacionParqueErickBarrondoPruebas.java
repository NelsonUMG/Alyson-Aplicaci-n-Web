package gt.gob.parqueerickbarrondo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;

class AplicacionParqueErickBarrondoPruebas {

    @Test
    void declaraElPuntoDeEntradaDeSpringBoot() {
        assertThat(AplicacionParqueErickBarrondo.class.getAnnotation(SpringBootApplication.class)).isNotNull();
    }
}
