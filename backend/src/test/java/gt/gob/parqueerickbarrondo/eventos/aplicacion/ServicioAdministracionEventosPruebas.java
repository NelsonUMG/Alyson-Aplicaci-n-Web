package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudEvento;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenEvento;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ServicioAdministracionEventosPruebas {

    @Mock
    private RepositorioEvento repositorioEvento;
    @Mock
    private RepositorioImagenEvento repositorioImagenEvento;
    @Mock
    private RepositorioInscripcionEvento repositorioInscripcion;
    @Mock
    private RepositorioUsuario repositorioUsuario;
    @Mock
    private ServicioAuditoria servicioAuditoria;
    @Mock
    private ServicioAlmacenamientoImagenesEvento servicioAlmacenamiento;
    @Mock
    private ObjectMapper serializadorJson;

    @InjectMocks
    private ServicioAdministracionEventos servicioAdministracion;

    @Test
    void rechazaUnaActualizacionConVersionObsoleta() {
        var evento = org.mockito.Mockito.mock(Evento.class);
        when(evento.obtenerVersion()).thenReturn(4L);
        when(repositorioEvento.buscarAdministradoPorId(9L)).thenReturn(Optional.of(evento));
        var solicitud = new SolicitudEvento(
                "Curso", "Descripción", "Pista", java.time.Instant.now().plusSeconds(3600),
                null, null, null, 20, null, List.of(), 3L);

        assertThatThrownBy(() -> servicioAdministracion.actualizar(
                9L, solicitud, org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("Recarga los datos");

        verify(evento, never()).actualizar(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void publicaUnBorradorYRegistraAuditoria() {
        var evento = org.mockito.Mockito.mock(Evento.class);
        when(evento.obtenerVersion()).thenReturn(1L, 2L);
        when(evento.obtenerEstado()).thenReturn("BORRADOR", "PUBLICADO");
        when(evento.obtenerIdEvento()).thenReturn(9L);
        when(evento.obtenerRequisitos()).thenReturn(List.of());
        when(repositorioEvento.buscarAdministradoPorId(9L)).thenReturn(Optional.of(evento));
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);

        var respuesta = servicioAdministracion.publicar(9L, 1L, actor);

        verify(evento).publicar();
        verify(servicioAuditoria).registrar(
                eq(5L), eq("EVENTOPUBLICADO"), eq("EVENTO"), eq("9"), eq("EXITOSO"), anyString());
        assertThat(respuesta.estado()).isEqualTo("PUBLICADO");
        assertThat(respuesta.version()).isEqualTo(2L);
    }
}
