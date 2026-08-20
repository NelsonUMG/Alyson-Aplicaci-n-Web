package gt.gob.parqueerickbarrondo.solicitudes.dominio;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import org.junit.jupiter.api.Test;

class SolicitudPruebas {

    @Test
    void pasaDeBorradorARevisionYResolucionSinCrearUnaReserva() {
        var usuario = new Usuario(
                "persona@example.com", "Ana", "López", "hash", Instant.now(),
                "1234567890101", "55554444", java.time.LocalDate.of(2000, 1, 1));
        var solicitud = new Solicitud(usuario, "USOINSTALACION", "{\"area\":\"Cancha uno\"}");

        assertThat(solicitud.obtenerEstado()).isEqualTo("BORRADOR");
        solicitud.actualizarBorrador("{\"area\":\"Cancha dos\"}");
        solicitud.enviar();
        assertThat(solicitud.obtenerEstado()).isEqualTo("ENVIADA");
        solicitud.iniciarRevision();
        assertThat(solicitud.obtenerEstado()).isEqualTo("ENREVISION");
        solicitud.resolver(true, "Disponible en el horario solicitado.");

        assertThat(solicitud.obtenerEstado()).isEqualTo("APROBADA");
        assertThat(solicitud.obtenerResolucion()).contains("Disponible");
        assertThat(solicitud.obtenerResueltoEn()).isNotNull();
    }
}
