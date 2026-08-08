package gt.gob.parqueerickbarrondo.areas.aplicacion;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;
import java.util.Set;

import gt.gob.parqueerickbarrondo.areas.dominio.ConexionMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.NodoMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioConexionMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioNodoMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaConexionMapaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaMapaPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaNodoMapaPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPasoRutaMapa;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaRutaMapa;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioMapaPublico {

    private static final Set<String> ESTADOS_BLOQUEADOS = Set.of(
            "ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO", "PENDIENTECONFIRMACION");

    private final RepositorioNodoMapa repositorioNodo;
    private final RepositorioConexionMapa repositorioConexion;
    private final RepositorioReservaArea repositorioReserva;

    public ServicioMapaPublico(
            RepositorioNodoMapa repositorioNodo,
            RepositorioConexionMapa repositorioConexion,
            RepositorioReservaArea repositorioReserva) {
        this.repositorioNodo = repositorioNodo;
        this.repositorioConexion = repositorioConexion;
        this.repositorioReserva = repositorioReserva;
    }

    @Transactional(readOnly = true)
    public RespuestaMapaPublico consultarMapa() {
        var datos = cargarDatosPublicos();
        var disponibilidad = calcularDisponibilidad(datos, Instant.now());
        var actualizaciones = new ArrayList<Instant>();
        datos.nodos().values().forEach(nodo -> actualizaciones.add(nodo.obtenerActualizadoEn()));
        datos.conexiones().forEach(conexion -> actualizaciones.add(conexion.obtenerActualizadoEn()));
        return new RespuestaMapaPublico(
                datos.nodos().values().stream()
                        .map(nodo -> convertirNodo(nodo, disponibilidad))
                        .toList(),
                datos.conexiones().stream().map(this::convertirConexion).toList(),
                actualizaciones.stream().max(Comparator.naturalOrder()).orElse(null));
    }

    @Transactional(readOnly = true)
    public RespuestaRutaMapa calcularRuta(Long idOrigen, Long idDestino, boolean perfilAccesible) {
        if (idOrigen == null || idDestino == null) {
            throw new SolicitudInvalidaException("Selecciona el origen y el destino de la ruta.");
        }
        var datos = cargarDatosPublicos();
        var origen = datos.nodos().get(idOrigen);
        var destino = datos.nodos().get(idDestino);
        if (origen == null || destino == null) {
            throw new RecursoNoEncontradoException(
                    "El origen o el destino no está disponible en el mapa confirmado.");
        }
        if (!nodoDisponible(origen, perfilAccesible) || !nodoDisponible(destino, perfilAccesible)) {
            throw new SolicitudInvalidaException(
                    "El origen o el destino no está disponible para el perfil solicitado.");
        }
        if (idOrigen.equals(idDestino)) {
            return new RespuestaRutaMapa(
                    idOrigen,
                    idDestino,
                    perfilAccesible,
                    BigDecimal.ZERO,
                    List.of(convertirPaso(origen)));
        }

        var adyacencias = construirAdyacencias(datos, perfilAccesible);
        var distancias = new HashMap<Long, BigDecimal>();
        var anteriores = new HashMap<Long, Long>();
        var pendientes = new PriorityQueue<Visita>(Comparator.comparing(Visita::distancia));
        var visitados = new HashSet<Long>();
        distancias.put(idOrigen, BigDecimal.ZERO);
        pendientes.add(new Visita(idOrigen, BigDecimal.ZERO));

        while (!pendientes.isEmpty()) {
            var visita = pendientes.poll();
            if (!visitados.add(visita.idNodo())) {
                continue;
            }
            if (visita.idNodo().equals(idDestino)) {
                break;
            }
            for (var trayecto : adyacencias.getOrDefault(visita.idNodo(), List.of())) {
                var nuevaDistancia = visita.distancia().add(trayecto.distancia());
                var conocida = distancias.get(trayecto.idDestino());
                if (conocida == null || nuevaDistancia.compareTo(conocida) < 0) {
                    distancias.put(trayecto.idDestino(), nuevaDistancia);
                    anteriores.put(trayecto.idDestino(), visita.idNodo());
                    pendientes.add(new Visita(trayecto.idDestino(), nuevaDistancia));
                }
            }
        }

        if (!distancias.containsKey(idDestino)) {
            throw new SolicitudInvalidaException(
                    "No hay una ruta disponible entre los puntos seleccionados. Prueba otro origen o destino.");
        }
        var identificadoresRuta = new ArrayList<Long>();
        for (Long actual = idDestino; actual != null; actual = anteriores.get(actual)) {
            identificadoresRuta.add(actual);
            if (actual.equals(idOrigen)) {
                break;
            }
        }
        java.util.Collections.reverse(identificadoresRuta);
        return new RespuestaRutaMapa(
                idOrigen,
                idDestino,
                perfilAccesible,
                distancias.get(idDestino),
                identificadoresRuta.stream()
                        .map(datos.nodos()::get)
                        .map(this::convertirPaso)
                        .toList());
    }

    private DatosMapa cargarDatosPublicos() {
        var nodos = repositorioNodo.buscarPublicos().stream().collect(
                java.util.stream.Collectors.toMap(
                        NodoMapa::obtenerIdNodoMapa,
                        nodo -> nodo,
                        (primero, ignorado) -> primero,
                        LinkedHashMap::new));
        var conexiones = repositorioConexion.buscarTodas().stream()
                .filter(conexion -> nodos.containsKey(conexion.obtenerNodoOrigen().obtenerIdNodoMapa()))
                .filter(conexion -> nodos.containsKey(conexion.obtenerNodoDestino().obtenerIdNodoMapa()))
                .toList();
        return new DatosMapa(nodos, conexiones);
    }

    private Map<Long, List<Trayecto>> construirAdyacencias(DatosMapa datos, boolean perfilAccesible) {
        var adyacencias = new HashMap<Long, List<Trayecto>>();
        for (var conexion : datos.conexiones()) {
            var origen = conexion.obtenerNodoOrigen();
            var destino = conexion.obtenerNodoDestino();
            if (conexion.estaCerrada()
                    || (perfilAccesible && !conexion.esAccesible())
                    || !nodoDisponible(origen, perfilAccesible)
                    || !nodoDisponible(destino, perfilAccesible)) {
                continue;
            }
            agregarTrayecto(adyacencias, origen, destino, conexion.obtenerDistanciaMetros());
            if (conexion.esBidireccional()) {
                agregarTrayecto(adyacencias, destino, origen, conexion.obtenerDistanciaMetros());
            }
        }
        return adyacencias;
    }

    private void agregarTrayecto(
            Map<Long, List<Trayecto>> adyacencias,
            NodoMapa origen,
            NodoMapa destino,
            BigDecimal distancia) {
        adyacencias.computeIfAbsent(origen.obtenerIdNodoMapa(), ignorado -> new ArrayList<>())
                .add(new Trayecto(destino.obtenerIdNodoMapa(), distancia));
    }

    private boolean nodoDisponible(NodoMapa nodo, boolean perfilAccesible) {
        if (perfilAccesible && !nodo.esAccesible()) {
            return false;
        }
        var area = nodo.obtenerArea();
        return area == null || !ESTADOS_BLOQUEADOS.contains(area.obtenerEstado());
    }

    private Map<Long, DisponibilidadArea> calcularDisponibilidad(DatosMapa datos, Instant ahora) {
        var areas = datos.nodos().values().stream()
                .map(NodoMapa::obtenerArea)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toMap(
                        Area::obtenerIdArea,
                        area -> area,
                        (primera, ignorada) -> primera,
                        LinkedHashMap::new));
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

    private RespuestaConexionMapaPublica convertirConexion(ConexionMapa conexion) {
        return new RespuestaConexionMapaPublica(
                conexion.obtenerIdConexionMapa(),
                conexion.obtenerNodoOrigen().obtenerIdNodoMapa(),
                conexion.obtenerNodoDestino().obtenerIdNodoMapa(),
                conexion.obtenerDistanciaMetros(),
                conexion.esBidireccional(),
                conexion.esAccesible(),
                conexion.estaCerrada(),
                conexion.obtenerMotivoCierre());
    }

    private RespuestaPasoRutaMapa convertirPaso(NodoMapa nodo) {
        return new RespuestaPasoRutaMapa(
                nodo.obtenerIdNodoMapa(), nodo.obtenerNombre(), nodo.obtenerTipoNodo());
    }

    private record DatosMapa(Map<Long, NodoMapa> nodos, List<ConexionMapa> conexiones) {
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

    private record Trayecto(Long idDestino, BigDecimal distancia) {
    }

    private record Visita(Long idNodo, BigDecimal distancia) {
    }
}
