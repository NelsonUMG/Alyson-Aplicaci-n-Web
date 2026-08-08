package gt.gob.parqueerickbarrondo.bicicletas.aplicacion;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.RespuestaBicicletaAdministrada;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.RespuestaHistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudActualizacionBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudCambioEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudRegistroBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.dominio.HistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia.RepositorioHistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia.RepositorioPrestamoBicicleta;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Bicicleta;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioBicicleta;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioAdministracionBicicletas {

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "DISPONIBLE", "PRESTADA", "ENMANTENIMIENTO",
            "DAÑADA", "NODEVUELTA", "FUERADESERVICIO");
    private static final Set<String> ESTADOS_DE_PRESTAMO = Set.of("PRESTADA", "NODEVUELTA");
    private static final Map<String, Set<String>> TRANSICIONES_VALIDAS = Map.of(
            "DISPONIBLE", Set.of("ENMANTENIMIENTO", "DAÑADA", "FUERADESERVICIO"),
            "ENMANTENIMIENTO", Set.of("DISPONIBLE", "DAÑADA", "FUERADESERVICIO"),
            "DAÑADA", Set.of("ENMANTENIMIENTO", "FUERADESERVICIO"),
            "FUERADESERVICIO", Set.of("ENMANTENIMIENTO"),
            "PRESTADA", Set.of("NODEVUELTA", "DISPONIBLE", "ENMANTENIMIENTO", "DAÑADA", "FUERADESERVICIO"),
            "NODEVUELTA", Set.of("DISPONIBLE", "ENMANTENIMIENTO", "DAÑADA", "FUERADESERVICIO"));

    private final RepositorioBicicleta repositorioBicicleta;
    private final RepositorioHistorialEstadoBicicleta repositorioHistorial;
    private final RepositorioPrestamoBicicleta repositorioPrestamo;
    private final RepositorioUsuario repositorioUsuario;
    private final ServicioIdempotencia servicioIdempotencia;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioAdministracionBicicletas(
            RepositorioBicicleta repositorioBicicleta,
            RepositorioHistorialEstadoBicicleta repositorioHistorial,
            RepositorioPrestamoBicicleta repositorioPrestamo,
            RepositorioUsuario repositorioUsuario,
            ServicioIdempotencia servicioIdempotencia,
            ServicioAuditoria servicioAuditoria) {
        this.repositorioBicicleta = repositorioBicicleta;
        this.repositorioHistorial = repositorioHistorial;
        this.repositorioPrestamo = repositorioPrestamo;
        this.repositorioUsuario = repositorioUsuario;
        this.servicioIdempotencia = servicioIdempotencia;
        this.servicioAuditoria = servicioAuditoria;
    }

    @PreAuthorize("hasAuthority('BICICLETALEER')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaBicicletaAdministrada> listar(
            String busqueda,
            String estado,
            int numeroPagina,
            int tamano) {
        var pagina = repositorioBicicleta.buscarAdministradas(
                normalizarBusqueda(busqueda),
                normalizarEstadoOpcional(estado),
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.asc("codigo"), Sort.Order.asc("idBicicleta"))));
        var identificadores = pagina.getContent().stream().map(Bicicleta::obtenerIdBicicleta).toList();
        var prestamosActivos = identificadores.isEmpty()
                ? Set.<Long>of()
                : new HashSet<>(repositorioPrestamo.buscarIdentificadoresConPrestamoActivo(identificadores));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream()
                        .map(bicicleta -> convertir(bicicleta, prestamosActivos.contains(
                                bicicleta.obtenerIdBicicleta())))
                        .toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('BICICLETALEER')")
    @Transactional(readOnly = true)
    public RespuestaBicicletaAdministrada consultar(Long idBicicleta) {
        var bicicleta = buscarBicicleta(idBicicleta);
        return convertir(bicicleta, tienePrestamoActivo(idBicicleta));
    }

    @PreAuthorize("hasAuthority('BICICLETACREAR')")
    @Transactional
    public RespuestaBicicletaAdministrada crear(
            SolicitudRegistroBicicleta solicitud,
            String claveIdempotencia,
            UsuarioSesion actor) {
        var contexto = servicioIdempotencia.preparar(
                claveIdempotencia,
                actor.obtenerIdUsuario(),
                "CREARBICICLETA",
                solicitud,
                RespuestaBicicletaAdministrada.class);
        if (contexto.tieneRespuestaRepetida()) {
            return contexto.respuestaRepetida();
        }
        var estado = normalizarEstado(solicitud.estadoInicial());
        if (ESTADOS_DE_PRESTAMO.contains(estado)) {
            throw new SolicitudInvalidaException(
                    "Una bicicleta nueva no puede iniciar en un estado asociado con un préstamo.");
        }
        var codigo = normalizarCodigo(solicitud.codigo());
        validarCodigoDisponible(codigo, null);
        var responsable = buscarResponsable(actor);
        var bicicleta = repositorioBicicleta.saveAndFlush(new Bicicleta(
                codigo,
                estado,
                normalizarOpcional(solicitud.observacionesInventario()),
                responsable));
        repositorioHistorial.save(new HistorialEstadoBicicleta(
                bicicleta,
                null,
                estado,
                solicitud.motivoEstadoInicial().strip(),
                responsable));
        auditar(actor, "BICICLETACREADA", bicicleta.obtenerIdBicicleta());
        var respuesta = convertir(bicicleta, false);
        servicioIdempotencia.completar(contexto, 201, respuesta);
        return respuesta;
    }

    @PreAuthorize("hasAuthority('BICICLETAACTUALIZARESTADO')")
    @Transactional
    public RespuestaBicicletaAdministrada actualizarInventario(
            Long idBicicleta,
            SolicitudActualizacionBicicleta solicitud,
            UsuarioSesion actor) {
        var bicicleta = buscarBicicleta(idBicicleta);
        validarVersion(bicicleta.obtenerVersion(), solicitud.version());
        var codigo = normalizarCodigo(solicitud.codigo());
        validarCodigoDisponible(codigo, idBicicleta);
        bicicleta.actualizarInventario(
                codigo,
                normalizarOpcional(solicitud.observacionesInventario()),
                buscarResponsable(actor));
        repositorioBicicleta.saveAndFlush(bicicleta);
        auditar(actor, "BICICLETAINVENTARIOACTUALIZADO", idBicicleta);
        return convertir(bicicleta, tienePrestamoActivo(idBicicleta));
    }

    @PreAuthorize("hasAuthority('BICICLETAACTUALIZARESTADO')")
    @Transactional
    public RespuestaBicicletaAdministrada cambiarEstado(
            Long idBicicleta,
            SolicitudCambioEstadoBicicleta solicitud,
            String claveIdempotencia,
            UsuarioSesion actor) {
        var contexto = servicioIdempotencia.preparar(
                claveIdempotencia,
                actor.obtenerIdUsuario(),
                "CAMBIARESTADOBICICLETA:" + idBicicleta,
                solicitud,
                RespuestaBicicletaAdministrada.class);
        if (contexto.tieneRespuestaRepetida()) {
            return contexto.respuestaRepetida();
        }
        var bicicleta = buscarBicicleta(idBicicleta);
        validarVersion(bicicleta.obtenerVersion(), solicitud.version());
        var estadoAnterior = bicicleta.obtenerEstado();
        var estadoNuevo = normalizarEstado(solicitud.estado());
        var prestamoActivo = tienePrestamoActivo(idBicicleta);
        if (estadoAnterior.equals(estadoNuevo)) {
            var respuestaActual = convertir(bicicleta, prestamoActivo);
            servicioIdempotencia.completar(contexto, 200, respuestaActual);
            return respuestaActual;
        }
        validarTransicion(estadoAnterior, estadoNuevo, prestamoActivo);
        var responsable = buscarResponsable(actor);
        bicicleta.cambiarEstado(estadoNuevo, responsable);
        repositorioHistorial.save(new HistorialEstadoBicicleta(
                bicicleta,
                estadoAnterior,
                estadoNuevo,
                solicitud.motivo().strip(),
                responsable));
        repositorioBicicleta.saveAndFlush(bicicleta);
        auditar(actor, "ESTADOBICICLETAACTUALIZADO", idBicicleta);
        var respuesta = convertir(bicicleta, prestamoActivo);
        servicioIdempotencia.completar(contexto, 200, respuesta);
        return respuesta;
    }

    @PreAuthorize("hasAuthority('BICICLETALEER')")
    @Transactional(readOnly = true)
    public List<RespuestaHistorialEstadoBicicleta> listarHistorial(Long idBicicleta) {
        if (!repositorioBicicleta.existsById(idBicicleta)) {
            throw new RecursoNoEncontradoException("No se encontró la bicicleta solicitada.");
        }
        return repositorioHistorial
                .findAllByBicicleta_IdBicicletaOrderByCambiadoEnDescIdHistorialEstadoBicicletaDesc(
                        idBicicleta)
                .stream()
                .map(historial -> {
                    var responsable = historial.obtenerCambiadoPor();
                    return new RespuestaHistorialEstadoBicicleta(
                            historial.obtenerIdHistorialEstadoBicicleta(),
                            historial.obtenerEstadoAnterior(),
                            historial.obtenerEstadoNuevo(),
                            historial.obtenerMotivo(),
                            responsable.obtenerIdUsuario(),
                            nombreCompleto(responsable),
                            historial.obtenerCambiadoEn());
                })
                .toList();
    }

    private void validarTransicion(String estadoAnterior, String estadoNuevo, boolean prestamoActivo) {
        if (!TRANSICIONES_VALIDAS.getOrDefault(estadoAnterior, Set.of()).contains(estadoNuevo)) {
            throw new SolicitudInvalidaException(
                    "La bicicleta no puede cambiar del estado actual al estado solicitado.");
        }
        if (prestamoActivo && !ESTADOS_DE_PRESTAMO.contains(estadoNuevo)) {
            throw new ConflictoDatosException(
                    "La bicicleta tiene un préstamo activo y no puede pasar al estado solicitado.");
        }
        if (!prestamoActivo && ESTADOS_DE_PRESTAMO.contains(estadoNuevo)) {
            throw new SolicitudInvalidaException(
                    "El estado solicitado requiere un préstamo activo administrado por su flujo correspondiente.");
        }
    }

    private Bicicleta buscarBicicleta(Long idBicicleta) {
        return repositorioBicicleta.buscarAdministradaPorId(idBicicleta)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró la bicicleta solicitada."));
    }

    private Usuario buscarResponsable(UsuarioSesion actor) {
        return repositorioUsuario.findById(actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró el usuario responsable."));
    }

    private boolean tienePrestamoActivo(Long idBicicleta) {
        return repositorioPrestamo.existsByBicicleta_IdBicicletaAndEstado(idBicicleta, "ACTIVO");
    }

    private String normalizarEstado(String estado) {
        var normalizado = estado.strip().toUpperCase(Locale.ROOT);
        if (!ESTADOS_VALIDOS.contains(normalizado)) {
            throw new SolicitudInvalidaException("El estado de la bicicleta no es válido.");
        }
        return normalizado;
    }

    private String normalizarEstadoOpcional(String estado) {
        return estado == null || estado.isBlank() ? "" : normalizarEstado(estado);
    }

    private String normalizarCodigo(String codigo) {
        return codigo.strip().toUpperCase(Locale.ROOT);
    }

    private String normalizarBusqueda(String busqueda) {
        if (busqueda == null) {
            return "";
        }
        if (busqueda.length() > 100) {
            throw new SolicitudInvalidaException("La búsqueda no puede superar 100 caracteres.");
        }
        return busqueda.strip();
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }

    private void validarCodigoDisponible(String codigo, Long idBicicleta) {
        var duplicado = idBicicleta == null
                ? repositorioBicicleta.existsByCodigoIgnoreCase(codigo)
                : repositorioBicicleta.existsByCodigoIgnoreCaseAndIdBicicletaNot(codigo, idBicicleta);
        if (duplicado) {
            throw new ConflictoDatosException("Ya existe una bicicleta con ese código.");
        }
    }

    private void validarVersion(Long actual, Long solicitada) {
        if (solicitada == null || !Objects.equals(actual, solicitada)) {
            throw new ConflictoDatosException(
                    "La bicicleta cambió desde la última consulta. Recarga los datos.");
        }
    }

    private RespuestaBicicletaAdministrada convertir(Bicicleta bicicleta, boolean prestamoActivo) {
        var responsable = bicicleta.obtenerActualizadoPor();
        return new RespuestaBicicletaAdministrada(
                bicicleta.obtenerIdBicicleta(),
                bicicleta.obtenerCodigo(),
                bicicleta.obtenerEstado(),
                bicicleta.obtenerObservacionesInventario(),
                prestamoActivo,
                responsable.obtenerIdUsuario(),
                nombreCompleto(responsable),
                bicicleta.obtenerCreadoEn(),
                bicicleta.obtenerActualizadoEn(),
                bicicleta.obtenerVersion());
    }

    private String nombreCompleto(Usuario usuario) {
        return usuario.obtenerNombre() + " " + usuario.obtenerApellido();
    }

    private void auditar(UsuarioSesion actor, String accion, Long idBicicleta) {
        servicioAuditoria.registrar(
                actor.obtenerIdUsuario(),
                accion,
                "BICICLETA",
                idBicicleta.toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }
}
