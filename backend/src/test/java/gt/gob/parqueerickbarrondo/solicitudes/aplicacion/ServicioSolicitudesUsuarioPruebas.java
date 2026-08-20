package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Solicitud;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitud;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class ServicioSolicitudesUsuarioPruebas {

    @Test
    void consultaUnicamenteLasSolicitudesDelUsuarioYGrupoSolicitado() {
        var repositorio = mock(RepositorioSolicitud.class);
        var solicitud = mock(Solicitud.class);
        when(solicitud.obtenerIdSolicitud()).thenReturn(12L);
        when(solicitud.obtenerTipoSolicitud()).thenReturn("USO_INSTALACION");
        when(solicitud.obtenerEstado()).thenReturn("ENREVISION");
        when(solicitud.obtenerCreadoEn()).thenReturn(Instant.parse("2026-08-01T14:00:00Z"));
        when(solicitud.obtenerActualizadoEn()).thenReturn(Instant.parse("2026-08-02T14:00:00Z"));
        when(solicitud.obtenerVersion()).thenReturn(1L);
        when(repositorio.findAllByUsuarioSolicitante_IdUsuarioAndEstadoIn(
                eq(7L), eq(java.util.Set.of("ENVIADA", "ENREVISION")), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(solicitud)));
        var servicio = new ServicioSolicitudesUsuario(repositorio);

        var respuesta = servicio.listar(7L, "enproceso", 0, 10);

        assertThat(respuesta.contenido()).hasSize(1);
        assertThat(respuesta.contenido().getFirst().nombreTipoSolicitud())
                .isEqualTo("Uso de cancha o instalación");
        assertThat(respuesta.contenido().getFirst().estado()).isEqualTo("ENREVISION");
        verify(repositorio).findAllByUsuarioSolicitante_IdUsuarioAndEstadoIn(
                eq(7L), eq(java.util.Set.of("ENVIADA", "ENREVISION")), any(Pageable.class));
    }

    @Test
    void rechazaUnGrupoDesconocidoAntesDeConsultarLaBase() {
        var repositorio = mock(RepositorioSolicitud.class);
        var servicio = new ServicioSolicitudesUsuario(repositorio);

        assertThatThrownBy(() -> servicio.listar(7L, "DESCONOCIDO", 0, 10))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("grupo");
        verify(repositorio, never()).findAllByUsuarioSolicitante_IdUsuarioAndEstadoIn(
                any(), any(), any());
    }
}
