package gt.gob.parqueerickbarrondo.compartido.configuracion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConfiguracionSeguridadPruebas {

    @Test
    void resumeLaContrasenaYConservaElIdentificadorDelAlgoritmo() {
        var codificador = new ConfiguracionSeguridad().codificadorContrasena();
        var resumen = codificador.encode("Frase larga de prueba 2026");

        assertThat(resumen).startsWith("{bcrypt}");
        assertThat(resumen).doesNotContain("Frase larga de prueba 2026");
        assertThat(codificador.matches("Frase larga de prueba 2026", resumen)).isTrue();
    }
}
