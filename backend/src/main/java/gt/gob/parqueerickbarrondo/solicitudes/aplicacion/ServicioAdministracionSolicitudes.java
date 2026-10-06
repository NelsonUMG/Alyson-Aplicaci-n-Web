package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.eventos.dominio.Notificacion;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioNotificacion;
import gt.gob.parqueerickbarrondo.areas.dominio.ReservaArea;
import gt.gob.parqueerickbarrondo.areas.infraestructura.persistencia.RepositorioReservaArea;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.DetalleUsoInstalacionSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDocumentoSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaSolicitudAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudResolucionAdministrativa;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Solicitud;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.SolicitudDocumento;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitudDocumento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioAdministracionSolicitudes {

    private static final Set<String> ESTADOS = Set.of(
            "ENVIADA", "ENREVISION", "APROBADA", "RECHAZADA", "CANCELADA");

    private final RepositorioSolicitud repositorioSolicitud;
    private final RepositorioSolicitudDocumento repositorioDocumento;
    private final RepositorioNotificacion repositorioNotificacion;
    private final RepositorioReservaArea repositorioReserva;
    private final RepositorioArea repositorioArea;
    private final RepositorioUsuario repositorioUsuario;
    private final ServicioAlmacenamientoDocumentosSolicitud almacenamiento;
    private final ServicioAuditoria auditoria;
    private final EnviadorCorreoResolucionSolicitud enviadorCorreo;
    private final ObjectMapper json;

    public ServicioAdministracionSolicitudes(
            RepositorioSolicitud repositorioSolicitud,
            RepositorioSolicitudDocumento repositorioDocumento,
            RepositorioNotificacion repositorioNotificacion,
            RepositorioReservaArea repositorioReserva,
            RepositorioArea repositorioArea,
            RepositorioUsuario repositorioUsuario,
            ServicioAlmacenamientoDocumentosSolicitud almacenamiento,
            ServicioAuditoria auditoria,
            EnviadorCorreoResolucionSolicitud enviadorCorreo,
            ObjectMapper json) {
        this.repositorioSolicitud = repositorioSolicitud;
        this.repositorioDocumento = repositorioDocumento;
        this.repositorioNotificacion = repositorioNotificacion;
        this.repositorioReserva = repositorioReserva;
        this.repositorioArea = repositorioArea;
        this.repositorioUsuario = repositorioUsuario;
        this.almacenamiento = almacenamiento;
        this.auditoria = auditoria;
        this.enviadorCorreo = enviadorCorreo;
        this.json = json;
    }

    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaSolicitudAdministrada> listar(
            String busqueda, String estado, int numeroPagina, int tamano) {
        var estadoNormalizado = normalizarEstado(estado);
        var pagina = repositorioSolicitud.buscarAdministradas(
                normalizarBusqueda(busqueda), estadoNormalizado,
                PageRequest.of(Math.max(numeroPagina, 0), Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.desc("actualizadoEn"), Sort.Order.desc("idSolicitud"))));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream().map(this::convertirListado).toList(),
                pagina.getNumber(), pagina.getSize(), pagina.getTotalElements(), pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    @Transactional(readOnly = true)
    public RespuestaDetalleSolicitud consultar(Long idSolicitud) {
        return convertirDetalle(buscar(idSolicitud));
    }

    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    @Transactional
    public RespuestaDetalleSolicitud iniciarRevision(
            Long idSolicitud, Long version, UsuarioSesion actor) {
        var solicitud = buscar(idSolicitud);
        validarVersion(solicitud, version);
        try {
            solicitud.iniciarRevision();
        } catch (IllegalStateException excepcion) {
            throw new SolicitudInvalidaException(excepcion.getMessage());
        }
        repositorioSolicitud.saveAndFlush(solicitud);
        auditar(actor, "SOLICITUDREVISIONINICIADA", solicitud);
        return convertirDetalle(solicitud);
    }

    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public RespuestaDetalleSolicitud resolver(
            Long idSolicitud, SolicitudResolucionAdministrativa datos, UsuarioSesion actor) {
        var solicitud = buscar(idSolicitud);
        validarVersion(solicitud, datos.version());
        if ("APROBADA".equals(datos.decision())) {
            crearReservaSiCorresponde(solicitud, actor);
        }
        try {
            solicitud.resolver("APROBADA".equals(datos.decision()), datos.respuesta().strip());
        } catch (IllegalStateException excepcion) {
            throw new SolicitudInvalidaException(excepcion.getMessage());
        }
        repositorioSolicitud.saveAndFlush(solicitud);
        guardarNotificacionYEnviarCorreo(solicitud);
        auditar(actor, "SOLICITUD" + datos.decision(), solicitud);
        return convertirDetalle(solicitud);
    }

    private void crearReservaSiCorresponde(Solicitud solicitud, UsuarioSesion actor) {
        var detalle = leerDetalle(solicitud);
        if (detalle.codigoArea() == null || detalle.codigoArea().isBlank()
                || detalle.fechaSolicitada() == null || detalle.horaInicio() == null
                || detalle.horaFin() == null) {
            return;
        }
        var area = repositorioArea.bloquearPorCodigoParaReserva(detalle.codigoArea().strip())
                .orElseThrow(() -> new SolicitudInvalidaException(
                        "El área de la solicitud ya no está disponible."));
        var zona = ZoneId.of("America/Guatemala");
        var iniciaEn = detalle.fechaSolicitada().atTime(detalle.horaInicio()).atZone(zona).toInstant();
        var finalizaEn = detalle.fechaSolicitada().atTime(detalle.horaFin()).atZone(zona).toInstant();
        if (!finalizaEn.isAfter(iniciaEn)) {
            throw new SolicitudInvalidaException("El horario de la solicitud no es válido.");
        }
        if (repositorioReserva.contarTraslapesActivos(
                area.obtenerIdArea(), iniciaEn, finalizaEn, null) > 0) {
            throw new ConflictoDatosException(
                    "El área ya tiene una reserva activa que coincide con el horario solicitado.");
        }
        var responsable = repositorioUsuario.findById(actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró el usuario responsable de la resolución."));
        var actividad = detalle.tipoActividad() == null || detalle.tipoActividad().isBlank()
                ? "Uso de instalación" : detalle.tipoActividad().strip();
        var titulo = "Solicitud #" + solicitud.obtenerIdSolicitud() + " · " + actividad;
        if (titulo.length() > 150) titulo = titulo.substring(0, 150);
        repositorioReserva.saveAndFlush(new ReservaArea(
                area, titulo, iniciaEn, finalizaEn, "PROGRAMADA",
                "Reserva creada al aprobar la solicitud #" + solicitud.obtenerIdSolicitud(), responsable));
    }

    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    @Transactional(readOnly = true)
    public ArchivoDocumentoSolicitud cargarDocumento(Long idSolicitud, Long idDocumentoSolicitud) {
        buscar(idSolicitud);
        var documento = buscarDocumento(idSolicitud, idDocumentoSolicitud).obtenerDocumento();
        if (!"ACTIVO".equals(documento.obtenerEstado())) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
        }
        return almacenamiento.cargar(documento.obtenerClaveAlmacenamiento(),
                documento.obtenerTipoMedio(), documento.obtenerNombreArchivoOriginal());
    }

    private Solicitud buscar(Long idSolicitud) {
        return repositorioSolicitud.buscarAdministradaPorId(idSolicitud)
                .filter(solicitud -> !"BORRADOR".equals(solicitud.obtenerEstado()))
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la solicitud indicada."));
    }

    private SolicitudDocumento buscarDocumento(Long idSolicitud, Long idDocumentoSolicitud) {
        return repositorioDocumento
                .findByIdSolicitudDocumentoAndSolicitud_IdSolicitud(idDocumentoSolicitud, idSolicitud)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el documento solicitado."));
    }

    private RespuestaSolicitudAdministrada convertirListado(Solicitud solicitud) {
        var detalle = leerDetalle(solicitud);
        var usuario = solicitud.obtenerUsuarioSolicitante();
        return new RespuestaSolicitudAdministrada(
                solicitud.obtenerIdSolicitud(), solicitud.obtenerEstado(),
                usuario.obtenerNombre() + " " + usuario.obtenerApellido(), usuario.obtenerCorreoNormalizado(),
                detalle.nombreArea() == null ? nombreTipo(solicitud.obtenerTipoSolicitud()) : detalle.nombreArea(),
                detalle.fechaSolicitada(), solicitud.obtenerCreadoEn(),
                solicitud.obtenerActualizadoEn(), solicitud.obtenerVersion());
    }

    private RespuestaDetalleSolicitud convertirDetalle(Solicitud solicitud) {
        var documentos = repositorioDocumento
                .findAllBySolicitud_IdSolicitudOrderByCreadoEnAscIdSolicitudDocumentoAsc(
                        solicitud.obtenerIdSolicitud())
                .stream().filter(relacion -> "ACTIVO".equals(relacion.obtenerDocumento().obtenerEstado()))
                .map(this::convertirDocumento).toList();
        return new RespuestaDetalleSolicitud(
                solicitud.obtenerIdSolicitud(), solicitud.obtenerTipoSolicitud(),
                nombreTipo(solicitud.obtenerTipoSolicitud()), solicitud.obtenerEstado(), leerDetalle(solicitud),
                documentos, solicitud.obtenerResolucion(), solicitud.obtenerCreadoEn(),
                solicitud.obtenerActualizadoEn(), solicitud.obtenerResueltoEn(), solicitud.obtenerVersion());
    }

    private RespuestaDocumentoSolicitud convertirDocumento(SolicitudDocumento relacion) {
        var documento = relacion.obtenerDocumento();
        return new RespuestaDocumentoSolicitud(
                relacion.obtenerIdSolicitudDocumento(), relacion.obtenerCategoriaDocumento(),
                "Documento de respaldo de la actividad", relacion.esObligatorio(),
                documento.obtenerNombreArchivoOriginal(), documento.obtenerTipoMedio(),
                documento.obtenerTamanoBytes(), relacion.obtenerCreadoEn(),
                "/api/v1/administracion/solicitudes/" + relacion.obtenerSolicitud().obtenerIdSolicitud()
                        + "/documentos/" + relacion.obtenerIdSolicitudDocumento() + "/archivo");
    }

    private DetalleUsoInstalacionSolicitud leerDetalle(Solicitud solicitud) {
        try {
            return json.readValue(solicitud.obtenerDetalle(), DetalleUsoInstalacionSolicitud.class);
        } catch (JacksonException excepcion) {
            throw new SolicitudInvalidaException("El detalle de la solicitud no es válido.");
        }
    }

    private void guardarNotificacionYEnviarCorreo(Solicitud solicitud) {
        try {
            var notificacion = new Notificacion(
                    solicitud.obtenerUsuarioSolicitante(), "RESPUESTASOLICITUD",
                    "Respuesta a solicitud #" + solicitud.obtenerIdSolicitud(),
                    json.writeValueAsString(Map.of(
                            "idSolicitud", solicitud.obtenerIdSolicitud(),
                            "estado", solicitud.obtenerEstado(),
                            "motivo", solicitud.obtenerResolucion())));
            repositorioNotificacion.save(notificacion);
            var usuario = solicitud.obtenerUsuarioSolicitante();
            try {
                enviadorCorreo.enviar(usuario.obtenerCorreoNormalizado(), usuario.obtenerNombre(),
                        solicitud.obtenerIdSolicitud(), solicitud.obtenerEstado(), solicitud.obtenerResolucion());
                notificacion.marcarEnviada();
            } catch (RuntimeException excepcionCorreo) {
                notificacion.marcarFallida();
            }
            repositorioNotificacion.save(notificacion);
        } catch (JacksonException excepcion) {
            throw new IllegalStateException("No fue posible generar la notificación de la solicitud.", excepcion);
        }
    }

    private String nombreTipo(String tipo) {
        return "DENUNCIAQUEJA".equals(tipo) ? "Denuncia o queja" : "Uso de cancha o instalación";
    }

    private String normalizarBusqueda(String busqueda) {
        if (busqueda == null) return "";
        var valor = busqueda.strip();
        if (valor.length() > 100) {
            throw new SolicitudInvalidaException("La búsqueda no puede superar 100 caracteres.");
        }
        return valor;
    }

    private String normalizarEstado(String estado) {
        if (estado == null || estado.isBlank()) return "";
        var valor = estado.strip().toUpperCase(Locale.ROOT);
        if (!ESTADOS.contains(valor)) {
            throw new SolicitudInvalidaException("El estado de solicitud no es válido.");
        }
        return valor;
    }

    private void validarVersion(Solicitud solicitud, Long version) {
        if (version == null || !version.equals(solicitud.obtenerVersion())) {
            throw new ConflictoDatosException(
                    "La solicitud cambió. Recarga la información antes de continuar.");
        }
    }

    private void auditar(UsuarioSesion actor, String accion, Solicitud solicitud) {
        auditoria.registrar(actor.obtenerIdUsuario(), accion, "SOLICITUD",
                solicitud.obtenerIdSolicitud().toString(), "EXITOSO", IdentificadorCorrelacion.actual());
    }
}
