package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.*;
import gt.gob.parqueerickbarrondo.eventos.dominio.*;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.*;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.*;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.*;

class InscripcionFamiliaPruebas {
    final RepositorioEvento eventos = mock(RepositorioEvento.class);
    final RepositorioInscripcionEvento inscripciones = mock(RepositorioInscripcionEvento.class);
    final RepositorioUsuario usuarios = mock(RepositorioUsuario.class);
    final ServicioIdempotencia idempotencia = mock(ServicioIdempotencia.class);
    final ServicioInscripcionesEvento servicio = new ServicioInscripcionesEvento(eventos, inscripciones,
            mock(RepositorioNotificacion.class), usuarios, idempotencia, mock(ServicioAuditoria.class), new ObjectMapper());
    Usuario padre;
    Evento curso;
    UsuarioSesion actor;
    final LocalDate hoy = LocalDate.now(ZoneId.of("America/Guatemala"));

    @BeforeEach void preparar() {
        padre = new Usuario("padre@example.com", "Responsable", "Prueba", "hash", null);
        ReflectionTestUtils.setField(padre, "idUsuario", 5L);
        ReflectionTestUtils.setField(padre, "fechaNacimiento", hoy.minusYears(28));
        actor = new UsuarioSesion(padre);
        curso = new Evento(padre, "Curso continuo", "curso-continuo", "Infantil", "Cancha", Instant.now().minusSeconds(86400),
                null, null, null, 20, null,
                "{\"grupos\":[{\"codigo\":\"infantil\",\"nombre\":\"Infantil\",\"edadMinima\":5,\"edadMaxima\":6}]}");
        ReflectionTestUtils.setField(curso, "idEvento", 7L);
        curso.configurarCursoContinuo(true); curso.publicar();
        when(eventos.findById(7L)).thenReturn(Optional.of(curso));
        when(usuarios.findById(5L)).thenReturn(Optional.of(padre));
        when(eventos.reservarCupo(eq(7L), any())).thenReturn(1);
        when(idempotencia.preparar(anyString(), eq(5L), anyString(), any(), eq(RespuestaInscripcionEvento.class)))
                .thenReturn(ServicioIdempotencia.ContextoIdempotencia.nuevo(mock(RegistroIdempotencia.class)));
        when(inscripciones.saveAndFlush(any())).thenAnswer(invocacion -> {
            InscripcionEvento i = invocacion.getArgument(0);
            ReflectionTestUtils.setField(i, "idInscripcionEvento", 12L);
            return i;
        });
    }
    SolicitudInscripcionEvento hijo(int edad) {
        return new SolicitudInscripcionEvento(true, "infantil", Map.of("_fotoParticipante", fotoPrueba()),
                new DatosParticipante("Hijo", "Prueba", hoy.minusYears(edad)));
    }
    String fotoPrueba() {
        try {
            var imagen = new java.awt.image.BufferedImage(10, 10, java.awt.image.BufferedImage.TYPE_INT_RGB);
            var bytes = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(imagen, "png", bytes);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes.toByteArray());
        } catch (java.io.IOException error) { throw new RuntimeException(error); }
    }
    @Test void padreDe28PuedeInscribirHijoDe6EnCursoYaIniciadoSinFin() {
        var respuesta = servicio.inscribir(7L, hijo(6), "prueba-hijo-uno", actor);
        assertThat(respuesta.nombreParticipante()).isEqualTo("Hijo");
        assertThat(respuesta.fechaNacimientoParticipante()).isEqualTo(hoy.minusYears(6));
        assertThat(respuesta.nombreResponsable()).isEqualTo("Responsable Prueba");
        verify(eventos).reservarCupo(eq(7L), any());
    }
    @Test void rechazaAlTitularAdultoEnElGrupoInfantil() {
        assertThatThrownBy(() -> servicio.inscribir(7L, new SolicitudInscripcionEvento(true, "infantil", Map.of()), "prueba-adulto", actor))
                .isInstanceOf(SolicitudInvalidaException.class).hasMessageContaining("edad");
        verify(eventos, never()).reservarCupo(any(), any());
    }
    @Test void validaLaEdadDelHijoSinUsarLaDelResponsable() {
        assertThatThrownBy(() -> servicio.inscribir(7L, hijo(9), "prueba-edad", actor))
                .isInstanceOf(SolicitudInvalidaException.class).hasMessageContaining("edad");
    }
    @Test void cadaHijoTieneIdentidadPropiaYSuPropioCupo() {
        servicio.inscribir(7L, hijo(5), "prueba-hijo-uno", actor);
        servicio.inscribir(7L, new SolicitudInscripcionEvento(true, "infantil", Map.of("_fotoParticipante", fotoPrueba()),
                new DatosParticipante("Otra hija", "Prueba", hoy.minusYears(6))), "prueba-hija-dos", actor);
        var claves = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(inscripciones, times(2)).buscarParticipanteParaActualizar(eq(7L), eq(5L), claves.capture());
        assertThat(claves.getAllValues()).doesNotHaveDuplicates();
        verify(eventos, times(2)).reservarCupo(eq(7L), any());
    }
    @Test void noDuplicaLaInscripcionDeUnMismoHijo() {
        when(inscripciones.buscarParticipanteParaActualizar(eq(7L), eq(5L), anyString()))
                .thenReturn(Optional.of(new InscripcionEvento(curso, padre, Instant.now())));
        assertThatThrownBy(() -> servicio.inscribir(7L, hijo(6), "prueba-repetido", actor))
                .isInstanceOf(ConflictoDatosException.class);
        verify(eventos, never()).reservarCupo(any(), any());
    }
    @Test void cursoConFechaFinalPasadaNoAdmiteInscripcion() {
        ReflectionTestUtils.setField(curso, "finalizaEn", Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> servicio.inscribir(7L, hijo(6), "prueba-vencido", actor))
                .isInstanceOf(SolicitudInvalidaException.class).hasMessageContaining("finalizó");
    }
    @Test void eventoPuntualSigueCerrandoAlIniciar() {
        curso.configurarCursoContinuo(false);
        assertThatThrownBy(() -> servicio.inscribir(7L, hijo(6), "prueba-puntual", actor))
                .isInstanceOf(SolicitudInvalidaException.class).hasMessageContaining("inició");
    }
    @Test void noPermiteConsultarInscripcionAjena() {
        when(inscripciones.findByIdInscripcionEventoAndUsuario_IdUsuario(99L, 5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> servicio.consultarParticipante(7L, 99L, actor)).isInstanceOf(RecursoNoEncontradoException.class);
    }
    @Test void exigeFotoDelNinoAntesDeReservarSuCupo() {
        assertThatThrownBy(() -> servicio.inscribir(7L,
                new SolicitudInscripcionEvento(true, "infantil", Map.of(),
                        new DatosParticipante("Hijo", "Prueba", hoy.minusYears(6))), "sin-foto", actor))
                .isInstanceOf(SolicitudInvalidaException.class).hasMessageContaining("Fotografía");
        verify(eventos, never()).reservarCupo(any(), any());
    }
    @Test void requisitoFotoAntiguoNumericoSeInterpretaComoFotografia() {
        ReflectionTestUtils.setField(curso, "esquemaFormularioJson",
                "{\"campos\":[{\"id\":\"foto\",\"etiqueta\":\"Foto del estudiante\",\"tipo\":\"NUMERO\",\"obligatorio\":true}]}");
        var solicitud = new SolicitudInscripcionEvento(true, "infantil", Map.of("foto", fotoPrueba()),
                new DatosParticipante("Hijo", "Prueba", hoy.minusYears(6)));
        servicio.inscribir(7L, solicitud, "foto-legada", actor);
        verify(eventos).reservarCupo(eq(7L), any());
    }
    @Test void fotoValidaSeRecodificaYArchivoFalsoSeRechaza() throws Exception {
        var imagen = new java.awt.image.BufferedImage(10, 10, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(imagen, "png", bytes);
        assertThat(FotoParticipante.validar("data:image/png;base64," + Base64.getEncoder().encodeToString(bytes.toByteArray())))
                .startsWith("data:image/png;base64,");
        assertThatThrownBy(() -> FotoParticipante.validar("data:image/png;base64," + Base64.getEncoder().encodeToString("<script>mal</script>".getBytes())))
                .isInstanceOf(SolicitudInvalidaException.class);
        assertThatThrownBy(() -> FotoParticipante.validar("data:image/svg+xml;base64,PHN2Zz4="))
                .isInstanceOf(SolicitudInvalidaException.class);
    }
}
