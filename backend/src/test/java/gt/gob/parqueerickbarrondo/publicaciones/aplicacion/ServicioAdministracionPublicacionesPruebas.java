package gt.gob.parqueerickbarrondo.publicaciones.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.List;

import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.ImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Publicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaPublicacionAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudPublicacion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ServicioAdministracionPublicacionesPruebas {

    @Mock
    private RepositorioCategoriaPublicacion repositorioCategoria;

    @Mock
    private RepositorioPublicacion repositorioPublicacion;

    @Mock
    private RepositorioImagenPublicacion repositorioImagen;

    @Mock
    private ServicioAlmacenamientoImagenesPublicacion servicioAlmacenamiento;

    @Mock
    private ServicioAuditoria servicioAuditoria;

    @Mock
    private ServicioIdempotencia servicioIdempotencia;

    @InjectMocks
    private ServicioAdministracionPublicaciones servicioAdministracion;

    @Test
    void generaElMenorCodigoNumericoDisponibleParaUnaCategoria() {
        when(repositorioCategoria.findAllCodigos()).thenReturn(List.of("1", "3", "NOTICIAS"));
        when(repositorioCategoria.saveAndFlush(any(CategoriaPublicacion.class))).thenAnswer(invocacion -> {
            var categoria = invocacion.getArgument(0, CategoriaPublicacion.class);
            ReflectionTestUtils.setField(categoria, "idCategoriaPublicacion", 10L);
            ReflectionTestUtils.setField(categoria, "version", 0L);
            return categoria;
        });
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);
        var solicitud = new SolicitudCategoriaPublicacion(
                "Canchas", "Espacios deportivos", 2, true, null);

        var respuesta = servicioAdministracion.crearCategoria(solicitud, actor);

        assertThat(respuesta.codigo()).isEqualTo("2");
        assertThat(respuesta.ordenVisualizacion()).isEqualTo((short) 2);
    }

    @Test
    void rechazaUnOrdenDeCategoriaRepetido() {
        when(repositorioCategoria.existsByOrdenVisualizacion((short) 1)).thenReturn(true);
        var solicitud = new SolicitudCategoriaPublicacion(
                "Canchas", null, 1, true, null);

        assertThatThrownBy(() -> servicioAdministracion.crearCategoria(
                solicitud, org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("orden 1");

        verify(repositorioCategoria, never()).findAllCodigos();
        verify(repositorioCategoria, never()).saveAndFlush(any(CategoriaPublicacion.class));
    }

    @Test
    void conservaElCodigoInternoAlActualizarUnaCategoria() {
        var categoria = new CategoriaPublicacion("7", "Canchas", null, (short) 1, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaPublicacion", 10L);
        ReflectionTestUtils.setField(categoria, "version", 0L);
        when(repositorioCategoria.findByIdCategoriaPublicacion(10L)).thenReturn(Optional.of(categoria));
        when(repositorioCategoria.saveAndFlush(categoria)).thenReturn(categoria);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);
        var solicitud = new SolicitudCategoriaPublicacion(
                "Canchas deportivas", null, 2, true, 0L);

        var respuesta = servicioAdministracion.actualizarCategoria(10L, solicitud, actor);

        assertThat(respuesta.codigo()).isEqualTo("7");
        assertThat(respuesta.nombre()).isEqualTo("Canchas deportivas");
        assertThat(respuesta.ordenVisualizacion()).isEqualTo((short) 2);
    }

    @Test
    void eliminaUnaCategoriaSinPublicacionesYRegistraAuditoria() {
        var categoria = new CategoriaPublicacion("1", "Noticias", null, (short) 1, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaPublicacion", 10L);
        ReflectionTestUtils.setField(categoria, "version", 2L);
        when(repositorioCategoria.findByIdCategoriaPublicacion(10L)).thenReturn(Optional.of(categoria));
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);

        servicioAdministracion.eliminarCategoria(10L, 2L, actor);

        verify(repositorioCategoria).delete(categoria);
        verify(repositorioCategoria).flush();
        verify(servicioAuditoria).registrar(
                eq(7L), eq("CATEGORIAPUBLICACIONELIMINADA"),
                eq("CATEGORIAPUBLICACION"), eq("10"), eq("EXITOSO"), anyString());
    }

    @Test
    void rechazaEliminarUnaCategoriaConPublicacionesAsociadas() {
        var categoria = new CategoriaPublicacion("1", "Noticias", null, (short) 1, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaPublicacion", 10L);
        ReflectionTestUtils.setField(categoria, "version", 2L);
        when(repositorioCategoria.findByIdCategoriaPublicacion(10L)).thenReturn(Optional.of(categoria));
        when(repositorioPublicacion.existsByCategoria_IdCategoriaPublicacion(10L)).thenReturn(true);

        assertThatThrownBy(() -> servicioAdministracion.eliminarCategoria(
                10L, 2L, org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("publicaciones asociadas");

        verify(repositorioCategoria, never()).delete(categoria);
    }

    @Test
    void devuelveLaMismaRespuestaCuandoSeRepiteUnaCreacionCompletada() {
        var solicitud = new SolicitudPublicacion(2L, "Título", "Resumen", "Contenido", null, null);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);
        var respuestaAnterior = new RespuestaPublicacionAdministrada(
                19L, 2L, "NOTICIAS", "Noticias", "Título", "titulo", "Resumen", "Contenido",
                "BORRADOR", null, null, null, 0L);
        var contexto = ServicioIdempotencia.ContextoIdempotencia.repetido(respuestaAnterior);
        when(servicioIdempotencia.preparar(
                eq("clave-repetida"),
                eq(7L),
                eq("CREARPUBLICACION"),
                eq(solicitud),
                eq(RespuestaPublicacionAdministrada.class)))
                .thenReturn(contexto);

        var respuesta = servicioAdministracion.crearPublicacion(solicitud, "clave-repetida", actor);

        assertThat(respuesta).isSameAs(respuestaAnterior);
        verify(repositorioPublicacion, never()).saveAndFlush(any(Publicacion.class));
    }

    @Test
    void rechazaUnaActualizacionConVersionObsoleta() {
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerVersion()).thenReturn(4L);
        when(repositorioPublicacion.buscarAdministradaPorId(10L)).thenReturn(Optional.of(publicacion));
        var solicitud = new SolicitudPublicacion(2L, "Título", "Resumen", "Contenido", null, 3L);

        assertThatThrownBy(() -> servicioAdministracion.actualizarPublicacion(
                10L, solicitud, org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("Recarga los datos");

        verify(publicacion, never()).actualizar(any(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void publicaConCategoriaActivaYRegistraAuditoria() {
        var categoria = org.mockito.Mockito.mock(CategoriaPublicacion.class);
        when(categoria.estaActiva()).thenReturn(true);
        when(categoria.obtenerIdCategoriaPublicacion()).thenReturn(2L);
        when(categoria.obtenerCodigo()).thenReturn("NOTICIAS");
        when(categoria.obtenerNombre()).thenReturn("Noticias");
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerVersion()).thenReturn(1L, 2L);
        when(publicacion.obtenerCategoria()).thenReturn(categoria);
        when(publicacion.obtenerEstado()).thenReturn("BORRADOR");
        when(publicacion.obtenerIdPublicacion()).thenReturn(10L);
        when(repositorioPublicacion.buscarAdministradaPorId(10L)).thenReturn(Optional.of(publicacion));
        when(repositorioImagen.countByPublicacion_IdPublicacion(10L)).thenReturn(1L);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);

        var respuesta = servicioAdministracion.publicar(10L, 1L, actor);

        verify(publicacion).publicar(any());
        verify(servicioAuditoria).registrar(
                eq(7L), eq("PUBLICACIONPUBLICADA"), eq("PUBLICACION"), eq("10"), eq("EXITOSO"), anyString());
        assertThat(respuesta.idPublicacion()).isEqualTo(10L);
        assertThat(respuesta.version()).isEqualTo(2L);
    }

    @Test
    void impidePublicarUnaNoticiaSinPortada() {
        var categoria = org.mockito.Mockito.mock(CategoriaPublicacion.class);
        when(categoria.estaActiva()).thenReturn(true);
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerVersion()).thenReturn(1L);
        when(publicacion.obtenerCategoria()).thenReturn(categoria);
        when(publicacion.obtenerEstado()).thenReturn("BORRADOR");
        when(repositorioPublicacion.buscarAdministradaPorId(10L)).thenReturn(Optional.of(publicacion));

        assertThatThrownBy(() -> servicioAdministracion.publicar(
                10L, 1L, org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException.class)
                .hasMessageContaining("imagen principal obligatoria");

        verify(publicacion, never()).publicar(any());
    }

    @Test
    void generaAutomaticamenteLaDescripcionAccesibleDeUnaImagen() {
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerEstado()).thenReturn("BORRADOR");
        when(publicacion.obtenerTitulo()).thenReturn("Festival familiar");
        when(repositorioPublicacion.buscarAdministradaPorId(10L)).thenReturn(Optional.of(publicacion));
        when(repositorioImagen.countByPublicacion_IdPublicacion(10L)).thenReturn(0L);
        var archivo = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        when(servicioAlmacenamiento.guardar(archivo)).thenReturn(new ArchivoImagenAlmacenada(
                "publicaciones/portada.jpg", "portada.jpg", "image/jpeg", 2048L, 1200, 800));
        when(repositorioImagen.saveAndFlush(any(ImagenPublicacion.class))).thenAnswer(invocacion -> {
            var imagen = invocacion.getArgument(0, ImagenPublicacion.class);
            ReflectionTestUtils.setField(imagen, "idImagenPublicacion", 31L);
            return imagen;
        });
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();

        try {
            var respuesta = servicioAdministracion.agregarImagen(10L, archivo, actor);

            assertThat(respuesta.textoAlternativo()).isEqualTo("Portada de Festival familiar");
            assertThat(respuesta.ordenVisualizacion()).isZero();
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void rechazaUnaImagenCuandoYaExistenLaPortadaYVeinteFotosDeGaleria() {
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerEstado()).thenReturn("BORRADOR");
        when(repositorioPublicacion.buscarAdministradaPorId(10L)).thenReturn(Optional.of(publicacion));
        when(repositorioImagen.countByPublicacion_IdPublicacion(10L)).thenReturn(21L);

        assertThatThrownBy(() -> servicioAdministracion.agregarImagen(
                10L,
                org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class),
                org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException.class)
                .hasMessageContaining("20 fotos de galería");

        verify(servicioAlmacenamiento, never()).guardar(any());
    }

    @Test
    void desarchivaComoBorradorYRegistraAuditoria() {
        var categoria = org.mockito.Mockito.mock(CategoriaPublicacion.class);
        when(categoria.obtenerIdCategoriaPublicacion()).thenReturn(2L);
        when(categoria.obtenerCodigo()).thenReturn("NOTICIAS");
        when(categoria.obtenerNombre()).thenReturn("Noticias");
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerVersion()).thenReturn(4L, 5L);
        when(publicacion.obtenerEstado()).thenReturn("ARCHIVADA", "BORRADOR");
        when(publicacion.obtenerCategoria()).thenReturn(categoria);
        when(publicacion.obtenerIdPublicacion()).thenReturn(10L);
        when(repositorioPublicacion.buscarAdministradaPorId(10L)).thenReturn(Optional.of(publicacion));
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);

        var respuesta = servicioAdministracion.desarchivar(10L, 4L, actor);

        verify(publicacion).desarchivar();
        verify(servicioAuditoria).registrar(
                eq(7L), eq("PUBLICACIONDESARCHIVADA"), eq("PUBLICACION"), eq("10"), eq("EXITOSO"), anyString());
        assertThat(respuesta.estado()).isEqualTo("BORRADOR");
        assertThat(respuesta.version()).isEqualTo(5L);
    }

    @Test
    void eliminaLaPublicacionSusImagenesYRegistraAuditoria() {
        var publicacion = org.mockito.Mockito.mock(Publicacion.class);
        when(publicacion.obtenerVersion()).thenReturn(6L);
        when(repositorioPublicacion.buscarAdministradaPorId(12L)).thenReturn(Optional.of(publicacion));
        var imagen = org.mockito.Mockito.mock(ImagenPublicacion.class);
        when(imagen.obtenerClaveAlmacenamiento()).thenReturn("publicaciones/imagen.jpg");
        when(repositorioImagen.findAllByPublicacion_IdPublicacionOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(12L))
                .thenReturn(List.of(imagen));
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();

        try {
            servicioAdministracion.eliminarPublicacion(12L, 6L, actor);
            var sincronizaciones = org.springframework.transaction.support.TransactionSynchronizationManager
                    .getSynchronizations();
            sincronizaciones.forEach(org.springframework.transaction.support.TransactionSynchronization::afterCommit);

            verify(repositorioImagen).deleteAllInBatch(List.of(imagen));
            verify(repositorioPublicacion).delete(publicacion);
            verify(servicioAlmacenamiento).eliminar("publicaciones/imagen.jpg");
            verify(servicioAuditoria).registrar(
                    eq(7L), eq("PUBLICACIONELIMINADA"), eq("PUBLICACION"), eq("12"), eq("EXITOSO"), anyString());
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
