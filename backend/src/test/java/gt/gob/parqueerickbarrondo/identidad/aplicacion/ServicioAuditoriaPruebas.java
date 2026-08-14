package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import gt.gob.parqueerickbarrondo.identidad.dominio.EventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioEventoAuditoria;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ServicioAuditoriaPruebas {

    @Mock
    private RepositorioEventoAuditoria repositorioEventoAuditoria;

    @InjectMocks
    private ServicioAuditoria servicioAuditoria;

    @Test
    void guardaCodigosDeAuditoriaConEtiquetasLegibles() {
        servicioAuditoria.registrar(
                5L,
                "IMAGENPUBLICACIONAGREGADA",
                "CATEGORIAPUBLICACION",
                "9",
                "EXITOSO",
                "correlacion");

        var captor = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(repositorioEventoAuditoria).save(captor.capture());
        var evento = captor.getValue();
        assertThat(evento.obtenerCodigoAccion()).isEqualTo("Imagen de publicación agregada");
        assertThat(evento.obtenerTipoRecurso()).isEqualTo("Categoría de publicación");
        assertThat(evento.obtenerResultado()).isEqualTo("Exitoso");
    }
}
