package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.*;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;

class ServicioFormularioEventoPruebas {
    @TempDir Path carpeta;
    final RepositorioEvento repositorio = mock(RepositorioEvento.class);
    ServicioFormularioEvento servicio;
    Evento evento;
    UsuarioSesion actor;

    @BeforeEach void preparar() {
        var usuario = new Usuario("admin@example.com", "Admin", "Prueba", "hash", null);
        actor = new UsuarioSesion(usuario);
        evento = new Evento(usuario, "Curso", "curso", "Descripción", "Parque", Instant.now().plusSeconds(86400), null, null, null, 20, null);
        when(repositorio.findById(7L)).thenReturn(Optional.of(evento));
        servicio = new ServicioFormularioEvento(repositorio, mock(ServicioAuditoria.class), carpeta.toString());
        TransactionSynchronizationManager.initSynchronization();
    }
    @AfterEach void limpiar() { TransactionSynchronizationManager.clearSynchronization(); }

    MockMultipartFile pdf() throws Exception {
        try (var documento = new org.apache.pdfbox.pdmodel.PDDocument()) {
            documento.addPage(new org.apache.pdfbox.pdmodel.PDPage());
            var salida = new java.io.ByteArrayOutputStream(); documento.save(salida);
            return new MockMultipartFile("archivo", "formulario.pdf", "application/pdf", salida.toByteArray());
        }
    }

    @Test void almacenaUnPdfRealYLoOfreceSoloParaUnCursoPublico() throws Exception {
        var respuesta = servicio.guardar(7L, pdf(), actor);
        assertThat(respuesta.nombreFormularioInscripcion()).isEqualTo("formulario.pdf");
        assertThat(servicio.cargarAdministrado(7L).recurso().exists()).isTrue();
        assertThatThrownBy(() -> servicio.cargarPublico("curso")).isInstanceOf(RecursoNoEncontradoException.class);
        evento.publicar();
        when(repositorio.buscarPublicoPorIdentificadorUrl(eq("curso"), any())).thenReturn(Optional.of(evento));
        assertThat(servicio.cargarPublico("curso").tipoMedio()).isEqualTo("application/pdf");
    }

    @Test void rechazaUnArchivoQueSoloTieneExtensionPdf() {
        var falso = new MockMultipartFile("archivo", "formulario.pdf", "application/pdf", "no es PDF".getBytes());
        assertThatThrownBy(() -> servicio.guardar(7L, falso, actor)).isInstanceOf(SolicitudInvalidaException.class);
        assertThat(evento.obtenerClaveFormularioInscripcion()).isNull();
        verify(repositorio, never()).saveAndFlush(any());
    }

    @Test void noDejaArchivosSiLaTransaccionFalla() throws Exception {
        servicio.guardar(7L, pdf(), actor);
        for (var sincronizacion : TransactionSynchronizationManager.getSynchronizations())
            sincronizacion.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        try (var archivos = Files.walk(carpeta)) { assertThat(archivos.filter(Files::isRegularFile).count()).isZero(); }
    }
}
