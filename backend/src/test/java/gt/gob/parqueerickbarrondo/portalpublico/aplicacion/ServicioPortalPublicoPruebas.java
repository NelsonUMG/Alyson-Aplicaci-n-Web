package gt.gob.parqueerickbarrondo.portalpublico.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaArea;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioBicicleta;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioPublicacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ServicioPortalPublicoPruebas {

    @Mock
    private RepositorioPublicacion repositorioPublicacion;

    @Mock
    private RepositorioCategoriaPublicacion repositorioCategoriaPublicacion;

    @Mock
    private RepositorioEvento repositorioEvento;

    @Mock
    private RepositorioArea repositorioArea;

    @Mock
    private RepositorioBicicleta repositorioBicicleta;

    @Mock
    private RepositorioImagenPublicacion repositorioImagenPublicacion;
    @Mock
    private RepositorioImagenEvento repositorioImagenEvento;

    @InjectMocks
    private ServicioPortalPublico servicioPortalPublico;

    @Test
    void calculaLosCuposDisponiblesEnElServidor() {
        var evento = org.mockito.Mockito.mock(Evento.class);
        when(evento.obtenerIdentificadorUrl()).thenReturn("curso-deportivo");
        when(evento.obtenerTitulo()).thenReturn("Curso deportivo");
        when(evento.obtenerDescripcion()).thenReturn("Descripción");
        when(evento.obtenerIniciaEn()).thenReturn(Instant.parse("2026-08-04T15:00:00Z"));
        when(evento.obtenerCapacidadTotal()).thenReturn(40);
        when(evento.obtenerCantidadOcupada()).thenReturn(17);
        when(evento.obtenerEstado()).thenReturn("PUBLICADO");
        var pagina = new PageImpl<>(List.of(evento), PageRequest.of(0, 10), 1);
        when(repositorioEvento.buscarAgendaPublica(anySet(), any(Instant.class), any(PageRequest.class)))
                .thenReturn(pagina);

        var respuesta = servicioPortalPublico.listarEventos(0, 10);

        assertThat(respuesta.contenido()).singleElement()
                .satisfies(resultado -> assertThat(resultado.cuposDisponibles()).isEqualTo(23));
    }

    @Test
    void noExponeCoordenadasQueNoHanSidoConfirmadas() {
        var categoria = org.mockito.Mockito.mock(CategoriaArea.class);
        when(categoria.obtenerCodigo()).thenReturn("DEPORTIVA");
        when(categoria.obtenerNombre()).thenReturn("Deportiva");
        var area = org.mockito.Mockito.mock(Area.class);
        when(area.obtenerCategoria()).thenReturn(categoria);
        when(area.obtenerCodigo()).thenReturn("CANCHA-1");
        when(area.obtenerNombre()).thenReturn("Cancha 1");
        when(area.obtenerEstado()).thenReturn("DISPONIBLE");
        when(area.tieneCoordenadasConfirmadas()).thenReturn(false);
        when(repositorioArea.buscarPublicas()).thenReturn(List.of(area));

        var respuesta = servicioPortalPublico.listarAreas();

        assertThat(respuesta).singleElement().satisfies(resultado -> {
            assertThat(resultado.latitud()).isNull();
            assertThat(resultado.longitud()).isNull();
        });
    }

    @Test
    void limitaElTamanoDePaginaSolicitado() {
        when(repositorioPublicacion.buscarPublicadas(
                any(String.class), any(String.class), any(), any(), any(Instant.class), any(PageRequest.class)))
                .thenAnswer(invocacion -> {
                    PageRequest pagina = invocacion.getArgument(5);
                    assertThat(pagina.getPageSize()).isEqualTo(50);
                    return new PageImpl<>(List.of(), pagina, 0);
                });

        servicioPortalPublico.listarPublicaciones("", "", null, null, -4, 500);
    }

    @Test
    void rechazaUnRangoDeFechasInvertido() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> servicioPortalPublico.listarPublicaciones(
                "", "", LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 9), 0, 5))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("fecha inicial");
    }
}
