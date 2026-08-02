package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NormalizadorCorreoPruebas {

    private final NormalizadorCorreo normalizador = new NormalizadorCorreo();

    @Test
    void eliminaEspaciosYNormalizaMayusculas() {
        assertThat(normalizador.normalizar("  Persona@Ejemplo.COM  ")).isEqualTo("persona@ejemplo.com");
    }
}
