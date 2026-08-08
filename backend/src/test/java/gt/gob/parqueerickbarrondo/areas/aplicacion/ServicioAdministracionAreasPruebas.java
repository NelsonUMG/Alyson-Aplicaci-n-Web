package gt.gob.parqueerickbarrondo.areas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudReservaArea;
import gt.gob.parqueerickbarrondo.areas.dominio.HistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioCategoriaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioConexionMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioHistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioNodoMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaArea;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ServicioAdministracionAreasPruebas {

    @Mock
    private RepositorioCategoriaArea repositorioCategoria;
    @Mock
    private RepositorioArea repositorioArea;
    @Mock
    private RepositorioHistorialEstadoArea repositorioHistorial;
    @Mock
    private RepositorioNodoMapa repositorioNodo;
    @Mock
    private RepositorioConexionMapa repositorioConexion;
    @Mock
    private RepositorioReservaArea repositorioReserva;
    @Mock
    private RepositorioUsuario repositorioUsuario;
    @Mock
    private ServicioAuditoria servicioAuditoria;
    @Mock
    private ServicioAlmacenamientoImagenesArea servicioAlmacenamiento;
    @Mock
    private ObjectMapper serializadorJson;

    @InjectMocks
    private ServicioAdministracionAreas servicioAdministracion;

    @Test
    void actualizaElEstadoYRegistraSuHistorialInmutableConElResponsable() {
        var responsable = new Usuario(
                "nelson@ejemplo.com", "Nelson", "Prueba", "hash", Instant.now());
        ReflectionTestUtils.setField(responsable, "idUsuario", 5L);
        var categoria = new CategoriaArea("DEPORTE", "Deporte", null, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaArea", 2L);
        ReflectionTestUtils.setField(categoria, "version", 0L);
        var area = new Area(
                categoria, "CANCHA1", 1, "Cancha", null, "DISPONIBLE", null,
                null, null, false, null, null, responsable);
        ReflectionTestUtils.setField(area, "idArea", 9L);
        ReflectionTestUtils.setField(area, "version", 3L);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        when(repositorioArea.buscarAdministradaPorId(9L)).thenReturn(Optional.of(area));
        when(repositorioCategoria.findByIdCategoriaArea(2L)).thenReturn(Optional.of(categoria));
        when(repositorioUsuario.findById(5L)).thenReturn(Optional.of(responsable));
        var solicitud = new SolicitudArea(
                2L, "CANCHA1", 1, "Cancha", null, "ENMANTENIMIENTO", null,
                null, null, false, null, "Revisión interna", "Reparación programada", 3L);

        var respuesta = servicioAdministracion.actualizarArea(9L, solicitud, actor);

        var historial = ArgumentCaptor.forClass(HistorialEstadoArea.class);
        verify(repositorioHistorial).save(historial.capture());
        assertThat(historial.getValue().obtenerEstadoAnterior()).isEqualTo("DISPONIBLE");
        assertThat(historial.getValue().obtenerEstadoNuevo()).isEqualTo("ENMANTENIMIENTO");
        assertThat(historial.getValue().obtenerMotivo()).isEqualTo("Reparación programada");
        assertThat(historial.getValue().obtenerCambiadoPor()).isSameAs(responsable);
        assertThat(respuesta.estado()).isEqualTo("ENMANTENIMIENTO");
        assertThat(respuesta.nombreActualizadoPor()).isEqualTo("Nelson Prueba");
        verify(servicioAuditoria).registrar(
                eq(5L), eq("AREAACTUALIZADA"), eq("AREA"), eq("9"), eq("EXITOSO"), anyString());
    }

    @Test
    void creaReservaSinPermitirTraslapesActivos() {
        var responsable = new Usuario(
                "nelson@ejemplo.com", "Nelson", "Prueba", "hash", Instant.now());
        ReflectionTestUtils.setField(responsable, "idUsuario", 5L);
        var categoria = new CategoriaArea("DEPORTE", "Deporte", null, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaArea", 2L);
        var area = new Area(
                categoria, "CANCHA1", 1, "Cancha", null, "DISPONIBLE", null,
                null, null, false, null, null, responsable);
        ReflectionTestUtils.setField(area, "idArea", 9L);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        when(repositorioArea.buscarAdministradaPorId(9L)).thenReturn(Optional.of(area));
        when(repositorioUsuario.findById(5L)).thenReturn(Optional.of(responsable));
        when(repositorioReserva.contarTraslapesActivos(eq(9L), org.mockito.Mockito.any(), org.mockito.Mockito.any(), eq(null)))
                .thenReturn(0L);
        when(repositorioReserva.saveAndFlush(org.mockito.Mockito.any(ReservaArea.class)))
                .thenAnswer(invocacion -> {
                    var reserva = invocacion.getArgument(0, ReservaArea.class);
                    ReflectionTestUtils.setField(reserva, "idReservaArea", 21L);
                    ReflectionTestUtils.setField(reserva, "version", 0L);
                    return reserva;
                });
        var inicio = Instant.now().plusSeconds(600);
        var solicitud = new SolicitudReservaArea(
                "Entrenamiento", inicio, inicio.plusSeconds(3600), "PROGRAMADA", null, null);

        var respuesta = servicioAdministracion.crearReservaArea(9L, solicitud, actor);

        assertThat(respuesta.idReservaArea()).isEqualTo(21L);
        assertThat(respuesta.estado()).isEqualTo("PROGRAMADA");
        verify(servicioAuditoria).registrar(
                eq(5L), eq("RESERVAAREACREADA"), eq("RESERVAAREA"), eq("21"), eq("EXITOSO"), anyString());
    }
}
