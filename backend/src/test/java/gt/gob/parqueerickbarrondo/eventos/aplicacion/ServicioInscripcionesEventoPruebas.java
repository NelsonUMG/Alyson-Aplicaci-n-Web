package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.compartido.idempotencia.RegistroIdempotencia;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.dominio.InscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.dominio.Notificacion;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioNotificacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ServicioInscripcionesEventoPruebas {

    @Mock
    private RepositorioEvento repositorioEvento;
    @Mock
    private RepositorioInscripcionEvento repositorioInscripcion;
    @Mock
    private RepositorioNotificacion repositorioNotificacion;
    @Mock
    private RepositorioUsuario repositorioUsuario;
    @Mock
    private ServicioIdempotencia servicioIdempotencia;
    @Mock
    private ServicioAuditoria servicioAuditoria;
    @Mock
    private ObjectMapper serializadorJson;

    @InjectMocks
    private ServicioInscripcionesEvento servicioInscripciones;

    @Test
    void devuelveLaRespuestaAnteriorCuandoSeRepiteLaMismaClave() {
        var solicitud = new SolicitudInscripcionEvento(true);
        var respuestaAnterior = new RespuestaInscripcionEvento(
                11L, 7L, "curso", "Curso", "CONFIRMADA", Instant.now(), "Pista",
                Instant.now(), Instant.now(), null, null, 3, 0L);
        var contexto = ServicioIdempotencia.ContextoIdempotencia.repetido(respuestaAnterior);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        when(servicioIdempotencia.preparar(
                "clave-repetida", 5L, "INSCRIBIREVENTO:7", solicitud, RespuestaInscripcionEvento.class))
                .thenReturn(contexto);

        var respuesta = servicioInscripciones.inscribir(7L, solicitud, "clave-repetida", actor);

        assertThat(respuesta).isSameAs(respuestaAnterior);
        verify(repositorioEvento, never()).reservarCupo(any(), any());
    }

    @Test
    void reservaCupoReactivaInscripcionYGeneraNotificacion() throws Exception {
        var ahora = Instant.now();
        var solicitud = new SolicitudInscripcionEvento(true);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        var evento = org.mockito.Mockito.mock(Evento.class);
        when(evento.obtenerIdEvento()).thenReturn(7L);
        when(evento.obtenerIdentificadorUrl()).thenReturn("curso");
        when(evento.obtenerTitulo()).thenReturn("Curso");
        when(evento.obtenerLugar()).thenReturn("Pista");
        when(evento.obtenerIniciaEn()).thenReturn(ahora.plusSeconds(86400));
        when(evento.obtenerEstado()).thenReturn("PUBLICADO");
        when(evento.obtenerCapacidadTotal()).thenReturn(20);
        when(evento.obtenerCantidadOcupada()).thenReturn(6);
        when(repositorioEvento.findById(7L)).thenReturn(Optional.of(evento));
        when(repositorioEvento.reservarCupo(eq(7L), any(Instant.class))).thenReturn(1);
        var usuario = org.mockito.Mockito.mock(Usuario.class);
        when(usuario.estaActivo()).thenReturn(true);
        when(repositorioUsuario.findById(5L)).thenReturn(Optional.of(usuario));
        var inscripcion = org.mockito.Mockito.mock(InscripcionEvento.class);
        when(inscripcion.estaConfirmada()).thenReturn(false);
        when(inscripcion.obtenerIdInscripcionEvento()).thenReturn(11L);
        when(inscripcion.obtenerEstado()).thenReturn("CONFIRMADA");
        when(inscripcion.obtenerVersion()).thenReturn(1L);
        when(repositorioInscripcion.buscarParaActualizar(7L, 5L)).thenReturn(Optional.of(inscripcion));
        when(repositorioInscripcion.saveAndFlush(inscripcion)).thenReturn(inscripcion);
        var contexto = ServicioIdempotencia.ContextoIdempotencia.<RespuestaInscripcionEvento>nuevo(
                org.mockito.Mockito.mock(RegistroIdempotencia.class));
        when(servicioIdempotencia.preparar(
                "clave-nueva", 5L, "INSCRIBIREVENTO:7", solicitud, RespuestaInscripcionEvento.class))
                .thenReturn(contexto);
        when(serializadorJson.writeValueAsString(any())).thenReturn("{}");

        var respuesta = servicioInscripciones.inscribir(7L, solicitud, "clave-nueva", actor);

        verify(repositorioEvento).reservarCupo(eq(7L), any(Instant.class));
        verify(inscripcion).confirmarNuevamente(any(Instant.class));
        verify(repositorioNotificacion).save(any(Notificacion.class));
        verify(servicioAuditoria).registrar(
                eq(5L), eq("INSCRIPCIONEVENTOCONFIRMADA"), eq("INSCRIPCIONEVENTO"),
                eq("11"), eq("EXITOSO"), anyString());
        verify(servicioIdempotencia).completar(eq(contexto), eq(201), any(RespuestaInscripcionEvento.class));
        assertThat(respuesta.cuposDisponibles()).isEqualTo(14);
    }

    @Test
    void rechazaUnEventoSinCuposAntesDeIntentarLaReserva() {
        var solicitud = new SolicitudInscripcionEvento(true);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        var evento = org.mockito.Mockito.mock(Evento.class);
        when(evento.obtenerEstado()).thenReturn("PUBLICADO");
        when(evento.obtenerIniciaEn()).thenReturn(Instant.now().plusSeconds(86400));
        when(evento.obtenerCapacidadTotal()).thenReturn(10);
        when(evento.obtenerCantidadOcupada()).thenReturn(10);
        when(repositorioEvento.findById(7L)).thenReturn(Optional.of(evento));
        when(servicioIdempotencia.preparar(
                eq("clave-nueva"), eq(5L), eq("INSCRIBIREVENTO:7"), eq(solicitud),
                eq(RespuestaInscripcionEvento.class)))
                .thenReturn(ServicioIdempotencia.ContextoIdempotencia.<RespuestaInscripcionEvento>nuevo(
                        org.mockito.Mockito.mock(RegistroIdempotencia.class)));

        assertThatThrownBy(() -> servicioInscripciones.inscribir(7L, solicitud, "clave-nueva", actor))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("cupos");

        verify(repositorioEvento, never()).reservarCupo(any(), any());
    }
}
