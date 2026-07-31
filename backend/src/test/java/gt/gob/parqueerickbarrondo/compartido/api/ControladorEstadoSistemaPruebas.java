package gt.gob.parqueerickbarrondo.compartido.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ControladorEstadoSistemaPruebas {

    @Test
    void informaLaIdentidadDeLaApi() {
        var respuesta = new ControladorEstadoSistema().consultarEstado();

        assertThat(respuesta.estado()).isEqualTo("DISPONIBLE");
        assertThat(respuesta.servicio()).isEqualTo("api-parque-erick-barrondo");
        assertThat(respuesta.versionApi()).isEqualTo("v1");
    }
}
