package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioNotificacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.DetalleUsoInstalacionSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudResolucionAdministrativa;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Solicitud;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitudDocumento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

class ServicioAdministracionSolicitudesPruebas {

    private final RepositorioSolicitud solicitudes = mock(RepositorioSolicitud.class);
    private final RepositorioSolicitudDocumento documentos = mock(RepositorioSolicitudDocumento.class);
    private final RepositorioNotificacion notificaciones = mock(RepositorioNotificacion.class);
    private final RepositorioReservaArea reservas = mock(RepositorioReservaArea.class);
    private final RepositorioArea areas = mock(RepositorioArea.class);
    private final RepositorioUsuario usuarios = mock(RepositorioUsuario.class);
    private final ServicioAlmacenamientoDocumentosSolicitud almacenamiento =
            mock(ServicioAlmacenamientoDocumentosSolicitud.class);
    private final ServicioAuditoria auditoria = mock(ServicioAuditoria.class);
    private final EnviadorCorreoResolucionSolicitud correo = mock(EnviadorCorreoResolucionSolicitud.class);
    private final ObjectMapper json = mock(ObjectMapper.class);
    private final Solicitud solicitud = mock(Solicitud.class);
    private final Usuario solicitante = mock(Usuario.class);
    private final Usuario responsable = mock(Usuario.class);
    private final UsuarioSesion actor = mock(UsuarioSesion.class);
    private final Area area = mock(Area.class);
    private ServicioAdministracionSolicitudes servicio;

    @BeforeEach
    void preparar() throws Exception {
        servicio = new ServicioAdministracionSolicitudes(
                solicitudes, documentos, notificaciones, reservas, areas, usuarios,
                almacenamiento, auditoria, correo, json);
        when(solicitudes.buscarAdministradaPorId(7L)).thenReturn(Optional.of(solicitud));
        when(solicitud.obtenerIdSolicitud()).thenReturn(7L);
        when(solicitud.obtenerVersion()).thenReturn(3L);
        when(solicitud.obtenerDetalle()).thenReturn("{}");
        when(solicitud.obtenerTipoSolicitud()).thenReturn("USOINSTALACION");
        when(solicitud.obtenerEstado()).thenReturn("APROBADA");
        when(solicitud.obtenerResolucion()).thenReturn("Aprobada");
        when(solicitud.obtenerUsuarioSolicitante()).thenReturn(solicitante);
        when(solicitante.obtenerNombre()).thenReturn("Persona");
        when(solicitante.obtenerCorreoNormalizado()).thenReturn("persona@example.com");
        when(documentos.findAllBySolicitud_IdSolicitudOrderByCreadoEnAscIdSolicitudDocumentoAsc(7L))
                .thenReturn(List.of());
        when(json.writeValueAsString(any())).thenReturn("{}");
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        when(usuarios.findById(5L)).thenReturn(Optional.of(responsable));
        when(areas.bloquearPorCodigoParaReserva("CANCHA-1")).thenReturn(Optional.of(area));
        when(area.obtenerIdArea()).thenReturn(11L);
    }

    @Test
    void aprobarCreaLaReservaConElHorarioSolicitado() throws Exception {
        var detalle = detalle();
        when(json.readValue(anyString(), eq(DetalleUsoInstalacionSolicitud.class))).thenReturn(detalle);
        when(reservas.contarTraslapesActivos(eq(11L), any(Instant.class), any(Instant.class), eq(null)))
                .thenReturn(0L);

        servicio.resolver(7L, new SolicitudResolucionAdministrativa("APROBADA", "Aprobada", 3L), actor);

        var captor = ArgumentCaptor.forClass(ReservaArea.class);
        verify(reservas).saveAndFlush(captor.capture());
        var reserva = captor.getValue();
        assertThat(reserva.obtenerArea()).isSameAs(area);
        assertThat(reserva.obtenerTitulo()).contains("Solicitud #7", "Entrenamiento");
        assertThat(reserva.obtenerEstado()).isEqualTo("PROGRAMADA");
        assertThat(reserva.obtenerIniciaEn()).isEqualTo(Instant.parse("2026-10-10T14:00:00Z"));
        assertThat(reserva.obtenerFinalizaEn()).isEqualTo(Instant.parse("2026-10-10T16:00:00Z"));
        verify(solicitud).resolver(true, "Aprobada");
    }

    @Test
    void aprobarRechazaUnTraslapeAntesDeCambiarLaSolicitud() throws Exception {
        when(json.readValue(anyString(), eq(DetalleUsoInstalacionSolicitud.class))).thenReturn(detalle());
        when(reservas.contarTraslapesActivos(eq(11L), any(Instant.class), any(Instant.class), eq(null)))
                .thenReturn(1L);

        assertThatThrownBy(() -> servicio.resolver(
                7L, new SolicitudResolucionAdministrativa("APROBADA", "Aprobada", 3L), actor))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("reserva activa");
        verify(reservas, never()).saveAndFlush(any());
        verify(solicitud, never()).resolver(any(Boolean.class), anyString());
    }

    private DetalleUsoInstalacionSolicitud detalle() {
        return new DetalleUsoInstalacionSolicitud(
                "CANCHA-1", "Cancha 1", LocalDate.of(2026, 10, 10),
                LocalTime.of(8, 0), LocalTime.of(10, 0), "Entrenamiento", 20,
                "Actividad", null, null, null, null, null, null, null, null, null);
    }
}
