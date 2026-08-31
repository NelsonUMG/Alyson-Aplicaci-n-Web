package gt.gob.parqueerickbarrondo.areas.aplicacion;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaAreaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.CoordenadaAreaMapa;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaCategoriaAreaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaConexionMapaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaHistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaNodoMapaAdministrado;
import gt.gob.parqueerickbarrondo.areas.api.modelo.RespuestaReservaAreaAdministrada;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudCategoriaArea;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudConexionMapa;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudNodoMapa;
import gt.gob.parqueerickbarrondo.areas.api.modelo.SolicitudReservaArea;
import gt.gob.parqueerickbarrondo.areas.dominio.ConexionMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.HistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.dominio.NodoMapa;
import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.dominio.VerticeAreaMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioCategoriaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioConexionMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioHistorialEstadoArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioNodoMapa;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.compartido.codigos.GeneradorCodigoAutomatico;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaArea;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioAdministracionAreas {

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "DISPONIBLE", "ENUSO", "ENMANTENIMIENTO", "CERRADA",
            "FUERADESERVICIO", "PENDIENTECONFIRMACION");
    private static final Set<String> TIPOS_NODO_VALIDOS = Set.of(
            "ENTRADA", "INTERSECCION", "DESTINO");
    private static final Set<String> ESTADOS_RESERVA_VALIDOS = Set.of(
            "PROGRAMADA", "ENUSO", "FINALIZADA", "CANCELADA");
    private static final Set<String> ESTADOS_RESERVA_CON_TRASLAPE = Set.of(
            "PROGRAMADA", "ENUSO");
    private static final Map<String, Set<String>> TRANSICIONES_VALIDAS = Map.of(
            "PENDIENTECONFIRMACION", Set.of("DISPONIBLE", "ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO"),
            "DISPONIBLE", Set.of("ENUSO", "ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO"),
            "ENUSO", Set.of("DISPONIBLE", "ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO"),
            "ENMANTENIMIENTO", Set.of("DISPONIBLE", "CERRADA", "FUERADESERVICIO"),
            "CERRADA", Set.of("DISPONIBLE", "ENMANTENIMIENTO", "FUERADESERVICIO"),
            "FUERADESERVICIO", Set.of("ENMANTENIMIENTO", "CERRADA"));

    private final RepositorioCategoriaArea repositorioCategoria;
    private final RepositorioArea repositorioArea;
    private final RepositorioHistorialEstadoArea repositorioHistorial;
    private final RepositorioNodoMapa repositorioNodo;
    private final RepositorioConexionMapa repositorioConexion;
    private final RepositorioReservaArea repositorioReserva;
    private final RepositorioUsuario repositorioUsuario;
    private final ServicioAuditoria servicioAuditoria;
    private final ServicioAlmacenamientoImagenesArea servicioAlmacenamiento;
    private final ObjectMapper serializadorJson;

    public ServicioAdministracionAreas(
            RepositorioCategoriaArea repositorioCategoria,
            RepositorioArea repositorioArea,
            RepositorioHistorialEstadoArea repositorioHistorial,
            RepositorioNodoMapa repositorioNodo,
            RepositorioConexionMapa repositorioConexion,
            RepositorioReservaArea repositorioReserva,
            RepositorioUsuario repositorioUsuario,
            ServicioAuditoria servicioAuditoria,
            ServicioAlmacenamientoImagenesArea servicioAlmacenamiento,
            ObjectMapper serializadorJson) {
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioArea = repositorioArea;
        this.repositorioHistorial = repositorioHistorial;
        this.repositorioNodo = repositorioNodo;
        this.repositorioConexion = repositorioConexion;
        this.repositorioReserva = repositorioReserva;
        this.repositorioUsuario = repositorioUsuario;
        this.servicioAuditoria = servicioAuditoria;
        this.servicioAlmacenamiento = servicioAlmacenamiento;
        this.serializadorJson = serializadorJson;
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public List<RespuestaCategoriaAreaAdministrada> listarCategorias() {
        return repositorioCategoria.findAllByOrderByNombreAsc().stream()
                .map(this::convertirCategoria)
                .toList();
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public RespuestaCategoriaAreaAdministrada crearCategoria(
            SolicitudCategoriaArea solicitud,
            UsuarioSesion actor) {
        var codigo = GeneradorCodigoAutomatico.siguiente(repositorioCategoria.findAllCodigos());
        var categoria = repositorioCategoria.saveAndFlush(new CategoriaArea(
                codigo,
                solicitud.nombre().strip(),
                normalizarOpcional(solicitud.descripcion()),
                solicitud.activa()));
        auditar(actor, "CATEGORIAAREACREADA", "CATEGORIAAREA", categoria.obtenerIdCategoriaArea());
        return convertirCategoria(categoria);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaCategoriaAreaAdministrada actualizarCategoria(
            Long idCategoria,
            SolicitudCategoriaArea solicitud,
            UsuarioSesion actor) {
        var categoria = buscarCategoria(idCategoria);
        validarVersion(categoria.obtenerVersion(), solicitud.version(), "La categoría de área");
        categoria.actualizar(
                categoria.obtenerCodigo(),
                solicitud.nombre().strip(),
                normalizarOpcional(solicitud.descripcion()),
                solicitud.activa());
        repositorioCategoria.saveAndFlush(categoria);
        auditar(actor, "CATEGORIAAREAACTUALIZADA", "CATEGORIAAREA", idCategoria);
        return convertirCategoria(categoria);
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaAreaAdministrada> listarAreas(
            String busqueda,
            String estado,
            Long idCategoria,
            int numeroPagina,
            int tamano) {
        var estadoNormalizado = normalizarEstadoOpcional(estado);
        var busquedaNormalizada = normalizarFiltro(busqueda);
        var pagina = repositorioArea.buscarAdministradas(
                busquedaNormalizada,
                estadoNormalizado,
                idCategoria,
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.asc("nombre"), Sort.Order.asc("idArea"))));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream().map(this::convertirArea).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public RespuestaAreaAdministrada consultarArea(Long idArea) {
        return convertirArea(buscarArea(idArea));
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public RespuestaAreaAdministrada crearArea(SolicitudArea solicitud, UsuarioSesion actor) {
        var responsable = buscarResponsable(actor);
        var categoria = buscarCategoriaActiva(solicitud.idCategoriaArea());
        var estado = normalizarEstado(solicitud.estado());
        validarDatosArea(solicitud, null, estado);
        validarUnicidadArea(solicitud, null);
        var perimetro = construirPerimetro(solicitud.perimetro());
        var centro = calcularCentro(perimetro);
        var area = new Area(
                categoria,
                GeneradorCodigoAutomatico.siguiente(repositorioArea.findAllCodigos()),
                solicitud.numeroVisibleMapa(),
                solicitud.nombre().strip(),
                normalizarOpcional(solicitud.descripcion()),
                estado,
                null,
                centro == null ? null : centro.latitud(),
                centro == null ? null : centro.longitud(),
                centro != null,
                normalizarJson(solicitud.horarioJson()),
                normalizarOpcional(solicitud.observacionesInternas()),
                responsable);
        area.establecerPerimetro(
                perimetro,
                !perimetro.isEmpty(),
                responsable);
        area = repositorioArea.saveAndFlush(area);
        repositorioHistorial.save(new HistorialEstadoArea(
                area,
                null,
                estado,
                solicitud.motivoCambioEstado().strip(),
                responsable));
        auditar(actor, "AREACREADA", "AREA", area.obtenerIdArea());
        return convertirArea(area);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaAreaAdministrada actualizarArea(
            Long idArea,
            SolicitudArea solicitud,
            UsuarioSesion actor) {
        var area = buscarArea(idArea);
        validarVersion(area.obtenerVersion(), solicitud.version(), "El área");
        var nuevoEstado = normalizarEstado(solicitud.estado());
        var estadoAnterior = area.obtenerEstado();
        validarDatosArea(solicitud, estadoAnterior, nuevoEstado);
        validarUnicidadArea(solicitud, idArea);
        var responsable = buscarResponsable(actor);
        var perimetro = construirPerimetro(solicitud.perimetro());
        var centro = calcularCentro(perimetro);
        area.actualizarDatos(
                buscarCategoriaActiva(solicitud.idCategoriaArea()),
                area.obtenerCodigo(),
                solicitud.numeroVisibleMapa(),
                solicitud.nombre().strip(),
                normalizarOpcional(solicitud.descripcion()),
                null,
                centro == null ? null : centro.latitud(),
                centro == null ? null : centro.longitud(),
                centro != null,
                perimetro,
                !perimetro.isEmpty(),
                normalizarJson(solicitud.horarioJson()),
                normalizarOpcional(solicitud.observacionesInternas()),
                responsable);
        if (!estadoAnterior.equals(nuevoEstado)) {
            area.cambiarEstado(nuevoEstado, responsable);
            repositorioHistorial.save(new HistorialEstadoArea(
                    area,
                    estadoAnterior,
                    nuevoEstado,
                    solicitud.motivoCambioEstado().strip(),
                    responsable));
        }
        repositorioArea.saveAndFlush(area);
        auditar(actor, "AREAACTUALIZADA", "AREA", idArea);
        return convertirArea(area);
    }

    @PreAuthorize("hasAuthority('AREAELIMINAR')")
    @Transactional
    public void eliminarArea(Long idArea, Long version, UsuarioSesion actor) {
        var area = buscarArea(idArea);
        validarVersion(area.obtenerVersion(), version, "El área");
        if (repositorioNodo.existsByArea_IdArea(idArea)
                || repositorioReserva.existsByArea_IdArea(idArea)
                || repositorioArea.contarSolicitudesMantenimiento(idArea) > 0) {
            throw new ConflictoDatosException(
                    "No se puede eliminar el área porque tiene información operativa asociada.");
        }
        repositorioHistorial.eliminarTodosPorIdArea(idArea);
        var claveImagen = area.obtenerClaveImagen();
        repositorioArea.delete(area);
        repositorioArea.flush();
        auditar(actor, "AREAELIMINADA", "AREA", idArea);
        eliminarArchivoAnteriorDespuesDeConfirmar(claveImagen);
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public List<RespuestaHistorialEstadoArea> listarHistorial(Long idArea) {
        if (!repositorioArea.existsById(idArea)) {
            throw new RecursoNoEncontradoException("No se encontró el área solicitada.");
        }
        return repositorioHistorial
                .findAllByArea_IdAreaOrderByCambiadoEnDescIdHistorialEstadoAreaDesc(idArea)
                .stream()
                .map(historial -> {
                    var responsable = historial.obtenerCambiadoPor();
                    return new RespuestaHistorialEstadoArea(
                            historial.obtenerIdHistorialEstadoArea(),
                            historial.obtenerEstadoAnterior(),
                            historial.obtenerEstadoNuevo(),
                            historial.obtenerMotivo(),
                            responsable.obtenerIdUsuario(),
                            nombreCompleto(responsable),
                            historial.obtenerCambiadoEn());
                })
                .toList();
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public List<RespuestaReservaAreaAdministrada> listarReservasArea(
            Long idArea,
            Instant desde,
            Instant hasta) {
        if (!repositorioArea.existsById(idArea)) {
            throw new RecursoNoEncontradoException("No se encontró el área solicitada.");
        }
        var ahora = Instant.now();
        var inicioConsulta = desde == null ? ahora.minus(1, ChronoUnit.DAYS) : desde;
        var finConsulta = hasta == null ? ahora.plus(14, ChronoUnit.DAYS) : hasta;
        return repositorioReserva.buscarAdministradasPorArea(idArea, inicioConsulta, finConsulta).stream()
                .map(this::convertirReserva)
                .toList();
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaReservaAreaAdministrada crearReservaArea(
            Long idArea,
            SolicitudReservaArea solicitud,
            UsuarioSesion actor) {
        var area = buscarArea(idArea);
        var responsable = buscarResponsable(actor);
        var estadoReserva = validarReserva(idArea, null, solicitud);
        var reserva = repositorioReserva.saveAndFlush(new ReservaArea(
                area,
                solicitud.titulo().strip(),
                solicitud.iniciaEn(),
                solicitud.finalizaEn(),
                estadoReserva,
                normalizarOpcional(solicitud.observaciones()),
                responsable));
        auditar(actor, "RESERVAAREACREADA", "RESERVAAREA", reserva.obtenerIdReservaArea());
        return convertirReserva(reserva);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaReservaAreaAdministrada actualizarReservaArea(
            Long idArea,
            Long idReservaArea,
            SolicitudReservaArea solicitud,
            UsuarioSesion actor) {
        var reserva = buscarReservaArea(idArea, idReservaArea);
        validarVersion(reserva.obtenerVersion(), solicitud.version(), "La reserva del área");
        var estadoReserva = validarReserva(idArea, idReservaArea, solicitud);
        reserva.actualizar(
                solicitud.titulo().strip(),
                solicitud.iniciaEn(),
                solicitud.finalizaEn(),
                estadoReserva,
                normalizarOpcional(solicitud.observaciones()),
                buscarResponsable(actor));
        repositorioReserva.saveAndFlush(reserva);
        auditar(actor, "RESERVAAREAACTUALIZADA", "RESERVAAREA", idReservaArea);
        return convertirReserva(reserva);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaAreaAdministrada agregarImagen(
            Long idArea,
            MultipartFile archivo,
            UsuarioSesion actor) {
        var area = buscarArea(idArea);
        var responsable = buscarResponsable(actor);
        var anterior = area.obtenerClaveImagen();
        var almacenada = servicioAlmacenamiento.guardar(archivo);
        eliminarArchivoSiTransaccionFalla(almacenada.claveAlmacenamiento());
        area.establecerClaveImagen(almacenada.claveAlmacenamiento(), responsable);
        repositorioArea.saveAndFlush(area);
        eliminarArchivoAnteriorDespuesDeConfirmar(anterior);
        auditar(actor, "IMAGENAREAACTUALIZADA", "AREA", idArea);
        return convertirArea(area);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaAreaAdministrada eliminarImagen(Long idArea, UsuarioSesion actor) {
        var area = buscarArea(idArea);
        var anterior = area.obtenerClaveImagen();
        if (anterior == null) {
            throw new RecursoNoEncontradoException("El área no tiene una imagen registrada.");
        }
        throw new SolicitudInvalidaException(
                "La imagen principal del área es obligatoria. Puedes reemplazarla por otra imagen.");
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public ArchivoImagenArea cargarImagen(Long idArea) {
        var area = buscarArea(idArea);
        if (area.obtenerClaveImagen() == null) {
            throw new RecursoNoEncontradoException("El área no tiene una imagen registrada.");
        }
        return servicioAlmacenamiento.cargar(area.obtenerClaveImagen());
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public List<RespuestaNodoMapaAdministrado> listarNodos() {
        return repositorioNodo.buscarTodosAdministrados().stream().map(this::convertirNodo).toList();
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaNodoMapaAdministrado crearNodo(SolicitudNodoMapa solicitud, UsuarioSesion actor) {
        var tipo = validarNodo(solicitud);
        var nodo = repositorioNodo.saveAndFlush(new NodoMapa(
                buscarAreaOpcional(solicitud.idArea()),
                tipo,
                solicitud.nombre().strip(),
                solicitud.latitud(),
                solicitud.longitud(),
                solicitud.coordenadasConfirmadas(),
                solicitud.accesible()));
        auditar(actor, "NODOMAPACREADO", "NODOMAPA", nodo.obtenerIdNodoMapa());
        return convertirNodo(nodo);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaNodoMapaAdministrado actualizarNodo(
            Long idNodo,
            SolicitudNodoMapa solicitud,
            UsuarioSesion actor) {
        var nodo = buscarNodo(idNodo);
        validarVersion(nodo.obtenerVersion(), solicitud.version(), "El nodo del mapa");
        var tipo = validarNodo(solicitud);
        nodo.actualizar(
                buscarAreaOpcional(solicitud.idArea()),
                tipo,
                solicitud.nombre().strip(),
                solicitud.latitud(),
                solicitud.longitud(),
                solicitud.coordenadasConfirmadas(),
                solicitud.accesible());
        repositorioNodo.saveAndFlush(nodo);
        auditar(actor, "NODOMAPAACTUALIZADO", "NODOMAPA", idNodo);
        return convertirNodo(nodo);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public void eliminarNodo(Long idNodo, UsuarioSesion actor) {
        var nodo = buscarNodo(idNodo);
        if (repositorioConexion.contarPorNodo(idNodo) > 0) {
            throw new ConflictoDatosException("El nodo no puede eliminarse porque tiene conexiones registradas.");
        }
        repositorioNodo.delete(nodo);
        repositorioNodo.flush();
        auditar(actor, "NODOMAPAELIMINADO", "NODOMAPA", idNodo);
    }

    @PreAuthorize("hasAuthority('AREALEER')")
    @Transactional(readOnly = true)
    public List<RespuestaConexionMapaAdministrada> listarConexiones() {
        return repositorioConexion.buscarTodas().stream().map(this::convertirConexion).toList();
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaConexionMapaAdministrada crearConexion(
            SolicitudConexionMapa solicitud,
            UsuarioSesion actor) {
        validarConexion(solicitud, null);
        var conexion = repositorioConexion.saveAndFlush(new ConexionMapa(
                buscarNodo(solicitud.idNodoOrigen()),
                buscarNodo(solicitud.idNodoDestino()),
                solicitud.distanciaMetros(),
                solicitud.bidireccional(),
                solicitud.accesible(),
                solicitud.cerrada(),
                normalizarMotivoCierre(solicitud)));
        auditar(actor, "CONEXIONMAPACREADA", "CONEXIONMAPA", conexion.obtenerIdConexionMapa());
        return convertirConexion(conexion);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public RespuestaConexionMapaAdministrada actualizarConexion(
            Long idConexion,
            SolicitudConexionMapa solicitud,
            UsuarioSesion actor) {
        var conexion = buscarConexion(idConexion);
        validarVersion(conexion.obtenerVersion(), solicitud.version(), "La conexión del mapa");
        validarConexion(solicitud, idConexion);
        conexion.actualizar(
                buscarNodo(solicitud.idNodoOrigen()),
                buscarNodo(solicitud.idNodoDestino()),
                solicitud.distanciaMetros(),
                solicitud.bidireccional(),
                solicitud.accesible(),
                solicitud.cerrada(),
                normalizarMotivoCierre(solicitud));
        repositorioConexion.saveAndFlush(conexion);
        auditar(actor, "CONEXIONMAPAACTUALIZADA", "CONEXIONMAPA", idConexion);
        return convertirConexion(conexion);
    }

    @PreAuthorize("hasAuthority('AREAACTUALIZARESTADO')")
    @Transactional
    public void eliminarConexion(Long idConexion, UsuarioSesion actor) {
        var conexion = buscarConexion(idConexion);
        repositorioConexion.delete(conexion);
        repositorioConexion.flush();
        auditar(actor, "CONEXIONMAPAELIMINADA", "CONEXIONMAPA", idConexion);
    }

    private void validarDatosArea(SolicitudArea solicitud, String estadoAnterior, String estadoNuevo) {
        normalizarJson(solicitud.horarioJson());
        if (estadoAnterior == null || !estadoAnterior.equals(estadoNuevo)) {
            if (solicitud.motivoCambioEstado() == null || solicitud.motivoCambioEstado().isBlank()) {
                throw new SolicitudInvalidaException("El motivo del estado del área es obligatorio.");
            }
            if (estadoAnterior != null
                    && !TRANSICIONES_VALIDAS.getOrDefault(estadoAnterior, Set.of()).contains(estadoNuevo)) {
                throw new SolicitudInvalidaException(
                        "El área no puede cambiar del estado actual al estado solicitado.");
            }
        }
    }

    private String validarReserva(Long idArea, Long idReservaArea, SolicitudReservaArea solicitud) {
        if (solicitud.iniciaEn() == null || solicitud.finalizaEn() == null) {
            throw new SolicitudInvalidaException("El inicio y la finalización de la reserva son obligatorios.");
        }
        if (!solicitud.finalizaEn().isAfter(solicitud.iniciaEn())) {
            throw new SolicitudInvalidaException("La reserva debe finalizar después de su inicio.");
        }
        var estadoReserva = solicitud.estado().strip().toUpperCase(Locale.ROOT);
        if (!ESTADOS_RESERVA_VALIDOS.contains(estadoReserva)) {
            throw new SolicitudInvalidaException("El estado de la reserva del área no es válido.");
        }
        if (ESTADOS_RESERVA_CON_TRASLAPE.contains(estadoReserva)
                && repositorioReserva.contarTraslapesActivos(
                        idArea, solicitud.iniciaEn(), solicitud.finalizaEn(), idReservaArea) > 0) {
            throw new ConflictoDatosException(
                    "Ya existe una reserva activa para esa área en el horario solicitado.");
        }
        return estadoReserva;
    }

    private void validarUnicidadArea(SolicitudArea solicitud, Long idArea) {
        if (solicitud.numeroVisibleMapa() != null) {
            var numeroDuplicado = idArea == null
                    ? repositorioArea.existsByNumeroVisibleMapa(solicitud.numeroVisibleMapa())
                    : repositorioArea.existsByNumeroVisibleMapaAndIdAreaNot(
                            solicitud.numeroVisibleMapa(), idArea);
            if (numeroDuplicado) {
                throw new ConflictoDatosException("El número visible del mapa ya está asignado a otra área.");
            }
        }
    }

    private String validarNodo(SolicitudNodoMapa solicitud) {
        validarCoordenadas(solicitud.latitud(), solicitud.longitud());
        var tipo = solicitud.tipoNodo().strip().toUpperCase(Locale.ROOT);
        if (!TIPOS_NODO_VALIDOS.contains(tipo)) {
            throw new SolicitudInvalidaException("El tipo de nodo solicitado no es válido.");
        }
        if ("DESTINO".equals(tipo) && solicitud.idArea() == null) {
            throw new SolicitudInvalidaException("Un nodo de destino debe estar asociado con un área.");
        }
        return tipo;
    }

    private void validarConexion(SolicitudConexionMapa solicitud, Long idConexion) {
        if (Objects.equals(solicitud.idNodoOrigen(), solicitud.idNodoDestino())) {
            throw new SolicitudInvalidaException("Los nodos de origen y destino deben ser distintos.");
        }
        var duplicada = idConexion == null
                ? repositorioConexion.existsByNodoOrigen_IdNodoMapaAndNodoDestino_IdNodoMapa(
                        solicitud.idNodoOrigen(), solicitud.idNodoDestino())
                : repositorioConexion
                        .existsByNodoOrigen_IdNodoMapaAndNodoDestino_IdNodoMapaAndIdConexionMapaNot(
                                solicitud.idNodoOrigen(), solicitud.idNodoDestino(), idConexion);
        if (duplicada) {
            throw new ConflictoDatosException("Ya existe una conexión entre esos nodos en esa dirección.");
        }
        normalizarMotivoCierre(solicitud);
    }

    private String normalizarMotivoCierre(SolicitudConexionMapa solicitud) {
        var motivo = normalizarOpcional(solicitud.motivoCierre());
        if (solicitud.cerrada() && motivo == null) {
            throw new SolicitudInvalidaException("El motivo de cierre de la conexión es obligatorio.");
        }
        return solicitud.cerrada() ? motivo : null;
    }

    private void validarCoordenadas(BigDecimal latitud, BigDecimal longitud) {
        if (latitud != null && (latitud.compareTo(BigDecimal.valueOf(-90)) < 0
                || latitud.compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw new SolicitudInvalidaException("La latitud debe estar entre -90 y 90.");
        }
        if (longitud != null && (longitud.compareTo(BigDecimal.valueOf(-180)) < 0
                || longitud.compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new SolicitudInvalidaException("La longitud debe estar entre -180 y 180.");
        }
    }

    private String normalizarJson(String contenido) {
        if (contenido == null || contenido.isBlank()) {
            return null;
        }
        var normalizado = contenido.strip();
        try {
            var estructura = serializadorJson.readTree(normalizado);
            if (estructura == null || !estructura.isObject()) {
                throw new SolicitudInvalidaException("El horario debe ser un objeto JSON válido.");
            }
            return normalizado;
        } catch (JacksonException excepcion) {
            throw new SolicitudInvalidaException("El horario debe contener JSON válido.");
        }
    }

    private String normalizarEstado(String estado) {
        var normalizado = estado.strip().toUpperCase(Locale.ROOT);
        if (!ESTADOS_VALIDOS.contains(normalizado)) {
            throw new SolicitudInvalidaException("El estado del área no es válido.");
        }
        return normalizado;
    }

    private String normalizarEstadoOpcional(String estado) {
        return estado == null || estado.isBlank() ? "" : normalizarEstado(estado);
    }

    private String normalizarFiltro(String busqueda) {
        if (busqueda == null) {
            return "";
        }
        if (busqueda.length() > 100) {
            throw new SolicitudInvalidaException("La búsqueda no puede superar 100 caracteres.");
        }
        return busqueda.strip();
    }

    private CategoriaArea buscarCategoria(Long idCategoria) {
        return repositorioCategoria.findByIdCategoriaArea(idCategoria)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró la categoría de área solicitada."));
    }

    private CategoriaArea buscarCategoriaActiva(Long idCategoria) {
        var categoria = buscarCategoria(idCategoria);
        if (!categoria.estaActiva()) {
            throw new SolicitudInvalidaException("La categoría de área seleccionada no está activa.");
        }
        return categoria;
    }

    private Area buscarArea(Long idArea) {
        return repositorioArea.buscarAdministradaPorId(idArea)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el área solicitada."));
    }

    private Area buscarAreaOpcional(Long idArea) {
        return idArea == null ? null : buscarArea(idArea);
    }

    private NodoMapa buscarNodo(Long idNodo) {
        return repositorioNodo.buscarAdministradoPorId(idNodo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el nodo del mapa solicitado."));
    }

    private ConexionMapa buscarConexion(Long idConexion) {
        return repositorioConexion.buscarPorId(idConexion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró la conexión del mapa solicitada."));
    }

    private ReservaArea buscarReservaArea(Long idArea, Long idReservaArea) {
        return repositorioReserva.buscarAdministradaPorId(idArea, idReservaArea)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró la reserva del área solicitada."));
    }

    private Usuario buscarResponsable(UsuarioSesion actor) {
        return repositorioUsuario.findById(actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario responsable."));
    }

    private RespuestaCategoriaAreaAdministrada convertirCategoria(CategoriaArea categoria) {
        return new RespuestaCategoriaAreaAdministrada(
                categoria.obtenerIdCategoriaArea(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                categoria.obtenerDescripcion(),
                categoria.estaActiva(),
                categoria.obtenerVersion());
    }

    private RespuestaAreaAdministrada convertirArea(Area area) {
        var categoria = area.obtenerCategoria();
        var responsable = area.obtenerActualizadoPor();
        var tieneImagen = area.obtenerClaveImagen() != null;
        return new RespuestaAreaAdministrada(
                area.obtenerIdArea(),
                categoria.obtenerIdCategoriaArea(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                area.obtenerCodigo(),
                area.obtenerNumeroVisibleMapa(),
                area.obtenerNombre(),
                area.obtenerDescripcion(),
                area.obtenerEstado(),
                area.obtenerNotaDisponibilidad(),
                area.obtenerLatitud(),
                area.obtenerLongitud(),
                area.tieneCoordenadasConfirmadas(),
                area.obtenerPerimetro().stream()
                        .map(vertice -> new CoordenadaAreaMapa(
                                vertice.obtenerLatitud(), vertice.obtenerLongitud()))
                        .toList(),
                area.tienePerimetroConfirmado(),
                area.obtenerHorarioJson(),
                area.obtenerObservacionesInternas(),
                tieneImagen,
                tieneImagen ? "/api/v1/administracion/areas/" + area.obtenerIdArea() + "/imagen" : null,
                responsable.obtenerIdUsuario(),
                nombreCompleto(responsable),
                area.obtenerCreadoEn(),
                area.obtenerActualizadoEn(),
                area.obtenerVersion());
    }

    private List<VerticeAreaMapa> construirPerimetro(List<CoordenadaAreaMapa> coordenadas) {
        if (coordenadas == null || coordenadas.isEmpty()) {
            return List.of();
        }
        var vertices = coordenadas.stream()
                .map(coordenada -> new VerticeAreaMapa(coordenada.latitud(), coordenada.longitud()))
                .toList();
        var distintos = coordenadas.stream()
                .map(coordenada -> coordenada.latitud().stripTrailingZeros().toPlainString()
                        + ":" + coordenada.longitud().stripTrailingZeros().toPlainString())
                .distinct()
                .count();
        if (distintos < 3) {
            throw new SolicitudInvalidaException(
                    "El perímetro debe incluir al menos tres vértices diferentes.");
        }
        return vertices;
    }

    private CentroArea calcularCentro(List<VerticeAreaMapa> perimetro) {
        if (perimetro.isEmpty()) {
            return null;
        }
        var divisor = BigDecimal.valueOf(perimetro.size());
        var latitud = perimetro.stream()
                .map(VerticeAreaMapa::obtenerLatitud)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(divisor, 8, java.math.RoundingMode.HALF_UP);
        var longitud = perimetro.stream()
                .map(VerticeAreaMapa::obtenerLongitud)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(divisor, 8, java.math.RoundingMode.HALF_UP);
        return new CentroArea(latitud, longitud);
    }

    private RespuestaNodoMapaAdministrado convertirNodo(NodoMapa nodo) {
        var area = nodo.obtenerArea();
        return new RespuestaNodoMapaAdministrado(
                nodo.obtenerIdNodoMapa(),
                area == null ? null : area.obtenerIdArea(),
                area == null ? null : area.obtenerCodigo(),
                area == null ? null : area.obtenerNombre(),
                nodo.obtenerTipoNodo(),
                nodo.obtenerNombre(),
                nodo.obtenerLatitud(),
                nodo.obtenerLongitud(),
                nodo.tieneCoordenadasConfirmadas(),
                nodo.esAccesible(),
                nodo.obtenerActualizadoEn(),
                nodo.obtenerVersion());
    }

    private RespuestaConexionMapaAdministrada convertirConexion(ConexionMapa conexion) {
        return new RespuestaConexionMapaAdministrada(
                conexion.obtenerIdConexionMapa(),
                conexion.obtenerNodoOrigen().obtenerIdNodoMapa(),
                conexion.obtenerNodoOrigen().obtenerNombre(),
                conexion.obtenerNodoDestino().obtenerIdNodoMapa(),
                conexion.obtenerNodoDestino().obtenerNombre(),
                conexion.obtenerDistanciaMetros(),
                conexion.esBidireccional(),
                conexion.esAccesible(),
                conexion.estaCerrada(),
                conexion.obtenerMotivoCierre(),
                conexion.obtenerActualizadoEn(),
                conexion.obtenerVersion());
    }

    private RespuestaReservaAreaAdministrada convertirReserva(ReservaArea reserva) {
        var area = reserva.obtenerArea();
        var responsable = reserva.obtenerActualizadoPor();
        return new RespuestaReservaAreaAdministrada(
                reserva.obtenerIdReservaArea(),
                area.obtenerIdArea(),
                area.obtenerCodigo(),
                area.obtenerNombre(),
                reserva.obtenerTitulo(),
                reserva.obtenerIniciaEn(),
                reserva.obtenerFinalizaEn(),
                reserva.obtenerEstado(),
                reserva.obtenerObservaciones(),
                responsable.obtenerIdUsuario(),
                nombreCompleto(responsable),
                reserva.obtenerCreadoEn(),
                reserva.obtenerActualizadoEn(),
                reserva.obtenerVersion());
    }

    private String nombreCompleto(Usuario usuario) {
        return usuario.obtenerNombre() + " " + usuario.obtenerApellido();
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }

    private void validarVersion(Long actual, Long solicitada, String recurso) {
        if (solicitada == null || !Objects.equals(actual, solicitada)) {
            throw new ConflictoDatosException(
                    recurso + " cambió desde la última consulta. Recarga los datos.");
        }
    }

    private void eliminarArchivoSiTransaccionFalla(String clave) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int estado) {
                if (estado != TransactionSynchronization.STATUS_COMMITTED) {
                    servicioAlmacenamiento.eliminar(clave);
                }
            }
        });
    }

    private void eliminarArchivoAnteriorDespuesDeConfirmar(String clave) {
        if (clave == null) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                servicioAlmacenamiento.eliminar(clave);
            }
        });
    }

    private void auditar(UsuarioSesion actor, String accion, String tipo, Long idRecurso) {
        servicioAuditoria.registrar(
                actor.obtenerIdUsuario(),
                accion,
                tipo,
                idRecurso.toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }

    private record CentroArea(BigDecimal latitud, BigDecimal longitud) {
    }
}
