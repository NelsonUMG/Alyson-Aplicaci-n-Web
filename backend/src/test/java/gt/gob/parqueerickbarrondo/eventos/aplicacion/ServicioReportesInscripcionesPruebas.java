package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import gt.gob.parqueerickbarrondo.eventos.dominio.InscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class ServicioReportesInscripcionesPruebas {

    @Mock
    private RepositorioEvento repositorioEvento;
    @Mock
    private RepositorioInscripcionEvento repositorioInscripcion;
    @InjectMocks
    private ServicioReportesInscripciones servicioReportes;

    @Test
    void resumeLosCursosConSuCantidadDePersonasInscritas() {
        var evento = org.mockito.Mockito.mock(Evento.class);
        when(evento.obtenerIdEvento()).thenReturn(7L);
        when(evento.obtenerTitulo()).thenReturn("Fútbol infantil");
        when(evento.obtenerLugar()).thenReturn("Cancha 2");
        when(evento.obtenerIniciaEn()).thenReturn(Instant.parse("2026-08-20T15:00:00Z"));
        when(evento.obtenerEstado()).thenReturn("PUBLICADO");
        when(evento.obtenerCantidadOcupada()).thenReturn(18);
        when(repositorioEvento.buscarAdministrados(eq("futbol"), eq(""), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(evento)));

        var respuesta = servicioReportes.listarCursos(" Futbol ", 0, 20);

        assertThat(respuesta.contenido()).singleElement().satisfies(curso -> {
            assertThat(curso.titulo()).isEqualTo("Fútbol infantil");
            assertThat(curso.cantidadPersonasInscritas()).isEqualTo(18);
            assertThat(curso.lugar()).isEqualTo("Cancha 2");
        });
    }

    @Test
    void listaSolamenteInscripcionesConfirmadasParaElReporte() {
        var usuario = org.mockito.Mockito.mock(Usuario.class);
        when(usuario.obtenerIdUsuario()).thenReturn(12L);
        when(usuario.obtenerNombre()).thenReturn("Ana");
        when(usuario.obtenerApellido()).thenReturn("López");
        when(usuario.obtenerCorreoNormalizado()).thenReturn("ana@example.com");
        var inscripcion = org.mockito.Mockito.mock(InscripcionEvento.class);
        when(inscripcion.obtenerIdInscripcionEvento()).thenReturn(31L);
        when(inscripcion.obtenerUsuario()).thenReturn(usuario);
        when(inscripcion.obtenerConfirmadaEn()).thenReturn(Instant.parse("2026-08-10T18:00:00Z"));
        when(repositorioEvento.existsById(7L)).thenReturn(true);
        when(repositorioInscripcion.buscarAdministradas(
                eq(7L), eq("ana"), eq("CONFIRMADA"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(inscripcion)));

        var respuesta = servicioReportes.listarPersonas(7L, " Ana ", 0, 20);

        assertThat(respuesta.contenido()).singleElement().satisfies(persona -> {
            assertThat(persona.nombre()).isEqualTo("Ana");
            assertThat(persona.correo()).isEqualTo("ana@example.com");
        });
        verify(repositorioInscripcion).buscarAdministradas(
                eq(7L), eq("ana"), eq("CONFIRMADA"), any(Pageable.class));
    }
}
