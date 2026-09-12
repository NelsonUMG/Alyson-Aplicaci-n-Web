package gt.gob.parqueerickbarrondo.areas.aplicacion;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import gt.gob.parqueerickbarrondo.areas.dominio.NodoMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioNodoMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaAreaMapaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaMapaPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaNodoMapaPublico;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioMapaPublico {

    private static final Set<String> ESTADOS_BLOQUEADOS = Set.of(
            "ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO", "PENDIENTECONFIRMACION");

    private final RepositorioNodoMapa repositorioNodo;
    private final RepositorioReservaArea repositorioReserva;
    private final RepositorioArea repositorioArea;

    public ServicioMapaPublico(
            RepositorioNodoMapa repositorioNodo,
            RepositorioReservaArea repositorioReserva,
            RepositorioArea repositorioArea) {
        this.repositorioNodo = repositorioNodo;
        this.repositorioReserva = repositorioReserva;
        this.repositorioArea = repositorioArea;
    }

    @Transactional(readOnly = true)
    public RespuestaMapaPublico consultarMapa() {
        var datos = cargarDatosPublicos();
        var disponibilidad = calcularDisponibilidad(datos, Instant.now());
        var actualizaciones = new ArrayList<Instant>();
        datos.nodos().values().forEach(nodo -> actualizaciones.add(nodo.obtenerActualizadoEn()));
        datos.areas().values().forEach(area -> actualizaciones.add(area.obtenerActualizadoEn()));
        return new RespuestaMapaPublico(
                datos.nodos().values().stream()
                        .filter(nodo -> nodo.obtenerArea() != null)
                        .filter(nodo -> "DESTINO".equals(nodo.obtenerTipoNodo()))
                        .map(nodo -> convertirNodo(nodo, disponibilidad))
                        .toList(),
                List.of(),
                datos.areas().values().stream()
                        .filter(Area::tienePerimetroConfirmado)
                        .filter(area -> area.obtenerPerimetro().size() >= 3)
                        .filter(area -> esAlertaPublica(area, disponibilidad))
                        .map(area -> convertirArea(area, disponibilidad))
                        .toList(),
                actualizaciones.stream().max(Comparator.naturalOrder()).orElse(null));
    }

    private DatosMapa cargarDatosPublicos() {
        var nodos = repositorioNodo.buscarPublicos().stream().collect(
                java.util.stream.Collectors.toMap(
                        NodoMapa::obtenerIdNodoMapa,
                        nodo -> nodo,
                        (primero, ignorado) -> primero,
                        LinkedHashMap::new));
        var areas = repositorioArea.buscarPublicas().stream().collect(
                java.util.stream.Collectors.toMap(
                        Area::obtenerIdArea,
                        area -> area,
                        (primera, ignorada) -> primera,
                        LinkedHashMap::new));
        nodos.values().stream()
                .map(NodoMapa::obtenerArea)
                .filter(Objects::nonNull)
                .forEach(area -> areas.putIfAbsent(area.obtenerIdArea(), area));
        return new DatosMapa(nodos, areas);
    }

    private Map<Long, DisponibilidadArea> calcularDisponibilidad(DatosMapa datos, Instant ahora) {
        var areas = datos.areas();
        if (areas.isEmpty()) {
            return Map.of();
        }

        var reservasPorArea = repositorioReserva.buscarVigentesPorAreas(areas.keySet(), ahora).stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        reserva -> reserva.obtenerArea().obtenerIdArea()));
        var resultado = new HashMap<Long, DisponibilidadArea>();
        areas.forEach((idArea, area) -> resultado.put(
                idArea,
                resolverDisponibilidad(area, reservasPorArea.getOrDefault(idArea, List.of()), ahora)));
        return resultado;
    }

    private DisponibilidadArea resolverDisponibilidad(
            Area area,
            List<ReservaArea> reservas,
            Instant ahora) {
        var estadoArea = area.obtenerEstado();
        if (ESTADOS_BLOQUEADOS.contains(estadoArea)) {
            return new DisponibilidadArea(
                    estadoArea, false, null, null, null, area.obtenerNotaDisponibilidad());
        }

        ReservaArea reservaActiva = null;
        ReservaArea reservaProxima = null;
        for (var reserva : reservas) {
            if (!reserva.obtenerIniciaEn().isAfter(ahora)
                    && reserva.obtenerFinalizaEn().isAfter(ahora)) {
                reservaActiva = reserva;
                continue;
            }
            if (reserva.obtenerIniciaEn().isAfter(ahora) && reservaProxima == null) {
                reservaProxima = reserva;
            }
        }

        if (reservaActiva != null) {
            return new DisponibilidadArea(
                    "ENUSO",
                    false,
                    reservaActiva.obtenerFinalizaEn(),
                    reservaActiva.obtenerTitulo(),
                    reservaProxima == null ? null : reservaProxima.obtenerTitulo(),
                    area.obtenerNotaDisponibilidad());
        }
        if ("ENUSO".equals(estadoArea)) {
            return new DisponibilidadArea(
                    "ENUSO",
                    false,
                    null,
                    null,
                    reservaProxima == null ? null : reservaProxima.obtenerTitulo(),
                    area.obtenerNotaDisponibilidad());
        }
        if (reservaProxima != null) {
            return new DisponibilidadArea(
                    "DISPONIBLE",
                    true,
                    reservaProxima.obtenerIniciaEn(),
                    null,
                    reservaProxima.obtenerTitulo(),
                    area.obtenerNotaDisponibilidad());
        }
        return new DisponibilidadArea(
                estadoArea,
                "DISPONIBLE".equals(estadoArea),
                null,
                null,
                null,
                area.obtenerNotaDisponibilidad());
    }

    private RespuestaNodoMapaPublico convertirNodo(
            NodoMapa nodo,
            Map<Long, DisponibilidadArea> disponibilidad) {
        var area = nodo.obtenerArea();
        var estadoTemporal = area == null
                ? DisponibilidadArea.sinArea()
                : disponibilidad.getOrDefault(
                        area.obtenerIdArea(),
                        new DisponibilidadArea(
                                area.obtenerEstado(),
                                "DISPONIBLE".equals(area.obtenerEstado()),
                                null,
                                null,
                                null,
                                area.obtenerNotaDisponibilidad()));
        return new RespuestaNodoMapaPublico(
                nodo.obtenerIdNodoMapa(),
                nodo.obtenerTipoNodo(),
                nodo.obtenerNombre(),
                nodo.obtenerLatitud(),
                nodo.obtenerLongitud(),
                nodo.esAccesible(),
                area == null ? null : area.obtenerIdArea(),
                area == null ? null : area.obtenerCodigo(),
                area == null ? null : area.obtenerNombre(),
                area == null ? null : area.obtenerEstado(),
                estadoTemporal.estadoCalculado(),
                estadoTemporal.disponibleAhora(),
                estadoTemporal.cambiaEstadoEn(),
                estadoTemporal.tituloReservaActiva(),
                estadoTemporal.tituloProximaReserva(),
                estadoTemporal.notaDisponibilidad());
    }

    private RespuestaAreaMapaPublica convertirArea(
            Area area,
            Map<Long, DisponibilidadArea> disponibilidad) {
        var estadoTemporal = disponibilidad.getOrDefault(
                area.obtenerIdArea(),
                new DisponibilidadArea(
                        area.obtenerEstado(),
                        "DISPONIBLE".equals(area.obtenerEstado()),
                        null,
                        null,
                        null,
                        area.obtenerNotaDisponibilidad()));
        var divisor = BigDecimal.valueOf(area.obtenerPerimetro().size());
        var latitudCentro = area.obtenerPerimetro().stream()
                .map(vertice -> vertice.obtenerLatitud())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(divisor, 8, java.math.RoundingMode.HALF_UP);
        var longitudCentro = area.obtenerPerimetro().stream()
                .map(vertice -> vertice.obtenerLongitud())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(divisor, 8, java.math.RoundingMode.HALF_UP);
        return new RespuestaAreaMapaPublica(
                area.obtenerIdArea(),
                area.obtenerCodigo(),
                area.obtenerNombre(),
                area.obtenerEstado(),
                estadoTemporal.estadoCalculado(),
                estadoTemporal.disponibleAhora(),
                estadoTemporal.cambiaEstadoEn(),
                estadoTemporal.tituloReservaActiva(),
                estadoTemporal.tituloProximaReserva(),
                estadoTemporal.notaDisponibilidad(),
                latitudCentro,
                longitudCentro);
    }

    private boolean esAlertaPublica(
            Area area,
            Map<Long, DisponibilidadArea> disponibilidad) {
        var estado = disponibilidad.getOrDefault(
                area.obtenerIdArea(),
                new DisponibilidadArea(area.obtenerEstado(), false, null, null, null, null))
                .estadoCalculado();
        return "ENUSO".equals(estado) || "ENMANTENIMIENTO".equals(estado);
    }

    private record DatosMapa(
            Map<Long, NodoMapa> nodos,
            Map<Long, Area> areas) {
    }

    private record DisponibilidadArea(
            String estadoCalculado,
            boolean disponibleAhora,
            Instant cambiaEstadoEn,
            String tituloReservaActiva,
            String tituloProximaReserva,
            String notaDisponibilidad) {

        static DisponibilidadArea sinArea() {
            return new DisponibilidadArea(null, true, null, null, null, null);
        }
    }

}
