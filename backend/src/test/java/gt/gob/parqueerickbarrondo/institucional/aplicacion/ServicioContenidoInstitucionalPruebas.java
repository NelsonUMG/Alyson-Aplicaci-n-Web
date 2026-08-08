package gt.gob.parqueerickbarrondo.institucional.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.institucional.api.modelo.SolicitudContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.dominio.ContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.infraestructura.persistencia.RepositorioContenidoInstitucional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ServicioContenidoInstitucionalPruebas {

    @Mock
    private RepositorioContenidoInstitucional repositorioContenido;

    @Mock
    private ServicioAuditoria servicioAuditoria;

    @InjectMocks
    private ServicioContenidoInstitucional servicioContenido;

    @Test
    void actualizaElContenidoConLaVersionVigenteYRegistraAuditoria() {
        var contenido = contenidoConVersion(3L);
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(7L);
        when(repositorioContenido.findById(1L)).thenReturn(Optional.of(contenido));
        when(repositorioContenido.saveAndFlush(contenido)).thenReturn(contenido);
        var solicitud = new SolicitudContenidoInstitucional(
                " Resumen actualizado. ", " Misión actualizada. ", " Visión actualizada. ", " Valores actualizados. ", 3L);

        var respuesta = servicioContenido.actualizar(solicitud, actor);

        assertThat(respuesta.resumen()).isEqualTo("Resumen actualizado.");
        assertThat(respuesta.mision()).isEqualTo("Misión actualizada.");
        assertThat(respuesta.vision()).isEqualTo("Visión actualizada.");
        assertThat(respuesta.valores()).isEqualTo("Valores actualizados.");
        verify(servicioAuditoria).registrar(
                eq(7L), eq("CONTENIDOINSTITUCIONALACTUALIZADO"), eq("CONTENIDOINSTITUCIONAL"),
                eq("1"), eq("EXITOSO"), anyString());
    }

    @Test
    void rechazaLaActualizacionConUnaVersionObsoleta() {
        var contenido = contenidoConVersion(4L);
        when(repositorioContenido.findById(1L)).thenReturn(Optional.of(contenido));
        var solicitud = new SolicitudContenidoInstitucional(
                "Resumen", "Misión", "Visión", "Valores", 3L);

        assertThatThrownBy(() -> servicioContenido.actualizar(solicitud, org.mockito.Mockito.mock(UsuarioSesion.class)))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("Recarga los datos");

        verify(repositorioContenido, never()).saveAndFlush(contenido);
    }

    private ContenidoInstitucional contenidoConVersion(long version) {
        var contenido = new ContenidoInstitucional("Resumen", "Misión", "Visión", "Valores");
        ReflectionTestUtils.setField(contenido, "version", version);
        return contenido;
    }
}
