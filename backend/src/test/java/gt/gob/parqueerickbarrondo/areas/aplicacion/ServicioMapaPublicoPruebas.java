package gt.gob.parqueerickbarrondo.areas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import gt.gob.parqueerickbarrondo.areas.dominio.ConexionMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.NodoMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.dominio.VerticeAreaMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioConexionMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioNodoMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaArea;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ServicioMapaPublicoPruebas {

    @Mock
    private RepositorioNodoMapa repositorioNodo;
    @Mock
    private RepositorioConexionMapa repositorioConexion;
    @Mock
    private RepositorioReservaArea repositorioReserva;
    @Mock
    private RepositorioArea repositorioArea;

    @InjectMocks
    private ServicioMapaPublico servicioMapa;

    private NodoMapa origen;
    private NodoMapa intermedio;
    private NodoMapa destino;
    private ConexionMapa conexionDirecta;
    private ConexionMapa conexionPrimerTramo;
    private ConexionMapa conexionSegundoTramo;

    @BeforeEach
    void prepararGrafo() {
        origen = nodo(1L, "Entrada", true);
        intermedio = nodo(2L, "Intersección", true);
        destino = nodo(3L, "Cancha", true, "DESTINO");
        conexionDirecta = conexion(11L, origen, destino, "50.00", false);
        conexionPrimerTramo = conexion(12L, origen, intermedio, "30.00", true);
        conexionSegundoTramo = conexion(13L, intermedio, destino, "30.00", true);
        when(repositorioNodo.buscarPublicos()).thenReturn(List.of(origen, intermedio, destino));
        when(repositorioConexion.buscarTodas()).thenReturn(List.of(
                conexionDirecta, conexionPrimerTramo, conexionSegundoTramo));
    }

    @Test
    void calculaPorElGrafoYRespetaElPerfilAccesible() {
        var rutaGeneral = servicioMapa.calcularRuta(1L, 3L, false);
        var rutaAccesible = servicioMapa.calcularRuta(1L, 3L, true);

        assertThat(rutaGeneral.distanciaTotalMetros()).isEqualByComparingTo("50.00");
        assertThat(rutaGeneral.pasos()).extracting("idNodoMapa").containsExactly(1L, 3L);
        assertThat(rutaAccesible.distanciaTotalMetros()).isEqualByComparingTo("60.00");
        assertThat(rutaAccesible.pasos()).extracting("idNodoMapa").containsExactly(1L, 2L, 3L);
    }

    @Test
    void excluyeUnaConexionCerradaDelCalculo() {
        conexionDirecta.actualizar(
                origen, destino, new BigDecimal("50.00"), true, false, true, "Trabajo en pista");

        var ruta = servicioMapa.calcularRuta(1L, 3L, false);

        assertThat(ruta.distanciaTotalMetros()).isEqualByComparingTo("60.00");
        assertThat(ruta.pasos()).extracting("idNodoMapa").containsExactly(1L, 2L, 3L);
    }

    @Test
    void publicaDisponibilidadCalculadaConReservaActiva() {
        var area = area(9L, "CANCHA1", "Cancha 1", "DISPONIBLE");
        ReflectionTestUtils.setField(destino, "area", area);
        var ahora = Instant.now();
        var reserva = reserva(21L, area, ahora.minusSeconds(60), ahora.plusSeconds(3600));
        when(repositorioReserva.buscarVigentesPorAreas(eq(Set.of(9L)), any(Instant.class)))
                .thenReturn(List.of(reserva));

        var mapa = servicioMapa.consultarMapa();

        var nodoPublicado = mapa.nodos().stream()
                .filter(nodo -> nodo.idNodoMapa().equals(3L))
                .findFirst()
                .orElseThrow();
        assertThat(nodoPublicado.idArea()).isEqualTo(9L);
        assertThat(nodoPublicado.estadoArea()).isEqualTo("DISPONIBLE");
        assertThat(nodoPublicado.estadoCalculadoArea()).isEqualTo("ENUSO");
        assertThat(nodoPublicado.disponibleAhora()).isFalse();
        assertThat(nodoPublicado.tituloReservaActiva()).isEqualTo("Entrenamiento");
        assertThat(nodoPublicado.cambiaEstadoEn()).isEqualTo(reserva.obtenerFinalizaEn());
    }

    @Test
    void publicaPerimetroConfirmadoConElEstadoCalculadoPorReservas() {
        var area = area(10L, "FUTBOL", "Cancha de fútbol", "DISPONIBLE");
        area.establecerPerimetro(List.of(
                new VerticeAreaMapa(new BigDecimal("14.63910000"), new BigDecimal("-90.54130000")),
                new VerticeAreaMapa(new BigDecimal("14.63910000"), new BigDecimal("-90.54090000")),
                new VerticeAreaMapa(new BigDecimal("14.63950000"), new BigDecimal("-90.54090000"))),
                true,
                area.obtenerActualizadoPor());
        var ahora = Instant.now();
        var reserva = reserva(22L, area, ahora.minusSeconds(60), ahora.plusSeconds(1800));
        when(repositorioArea.buscarPublicas()).thenReturn(List.of(area));
        when(repositorioReserva.buscarVigentesPorAreas(eq(Set.of(10L)), any(Instant.class)))
                .thenReturn(List.of(reserva));

        var mapa = servicioMapa.consultarMapa();

        assertThat(mapa.areas()).singleElement().satisfies(areaPublica -> {
            assertThat(areaPublica.nombreArea()).isEqualTo("Cancha de fútbol");
            assertThat(areaPublica.estadoCalculadoArea()).isEqualTo("ENUSO");
            assertThat(areaPublica.disponibleAhora()).isFalse();
            assertThat(areaPublica.tituloReservaActiva()).isEqualTo("Entrenamiento");
            assertThat(areaPublica.latitudCentro()).isEqualByComparingTo("14.63923333");
            assertThat(areaPublica.longitudCentro()).isEqualByComparingTo("-90.54103333");
        });
    }

    private NodoMapa nodo(Long id, String nombre, boolean accesible) {
        return nodo(id, nombre, accesible, "INTERSECCION");
    }

    private NodoMapa nodo(Long id, String nombre, boolean accesible, String tipoNodo) {
        var nodo = new NodoMapa(
                null, tipoNodo, nombre, new BigDecimal("14.60000000"),
                new BigDecimal("-90.55000000"), true, accesible);
        ReflectionTestUtils.setField(nodo, "idNodoMapa", id);
        ReflectionTestUtils.setField(nodo, "version", 0L);
        return nodo;
    }

    private ConexionMapa conexion(
            Long id,
            NodoMapa nodoOrigen,
            NodoMapa nodoDestino,
            String distancia,
            boolean accesible) {
        var conexion = new ConexionMapa(
                nodoOrigen, nodoDestino, new BigDecimal(distancia), true, accesible, false, null);
        ReflectionTestUtils.setField(conexion, "idConexionMapa", id);
        ReflectionTestUtils.setField(conexion, "version", 0L);
        return conexion;
    }

    private Area area(Long id, String codigo, String nombre, String estado) {
        var responsable = new Usuario(
                "admin@prueba.local", "Admin", "Prueba", "hash", Instant.now());
        ReflectionTestUtils.setField(responsable, "idUsuario", 1L);
        var categoria = new CategoriaArea("DEPORTE", "Deporte", null, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaArea", 2L);
        var area = new Area(
                categoria, codigo, 1, nombre, null, estado, null,
                null, null, true, null, null, responsable);
        ReflectionTestUtils.setField(area, "idArea", id);
        ReflectionTestUtils.setField(area, "version", 0L);
        return area;
    }

    private ReservaArea reserva(Long id, Area area, Instant iniciaEn, Instant finalizaEn) {
        var responsable = new Usuario(
                "admin@prueba.local", "Admin", "Prueba", "hash", Instant.now());
        ReflectionTestUtils.setField(responsable, "idUsuario", 1L);
        var reserva = new ReservaArea(
                area, "Entrenamiento", iniciaEn, finalizaEn, "PROGRAMADA", null, responsable);
        ReflectionTestUtils.setField(reserva, "idReservaArea", id);
        ReflectionTestUtils.setField(reserva, "version", 0L);
        return reserva;
    }
}
