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

import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Publicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaPublicacionAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudPublicacion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);

        var respuesta = servicioAdministracion.publicar(10L, 1L, actor);

        verify(publicacion).publicar(any());
        verify(servicioAuditoria).registrar(
                eq(7L), eq("PUBLICACIONPUBLICADA"), eq("PUBLICACION"), eq("10"), eq("EXITOSO"), anyString());
        assertThat(respuesta.idPublicacion()).isEqualTo(10L);
        assertThat(respuesta.version()).isEqualTo(2L);
    }
}
