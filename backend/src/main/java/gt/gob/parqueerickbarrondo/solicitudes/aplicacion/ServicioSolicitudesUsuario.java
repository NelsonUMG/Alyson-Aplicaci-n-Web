package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import java.text.Normalizer;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.DatosSolicitanteSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.DetalleUsoInstalacionSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaConteosSolicitudes;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDocumentoSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaPaginaSolicitudesUsuario;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaProcedimientoUsoInstalacion;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaSolicitudUsuario;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudUsoInstalacion;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Documento;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Solicitud;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.SolicitudDocumento;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioDocumento;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioSolicitudDocumento;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioSolicitudesUsuario {

    private static final Set<String> BORRADORES = Set.of("BORRADOR");
    private static final Set<String> EN_PROCESO = Set.of("ENVIADA", "ENREVISION");
    private static final Set<String> FINALIZADAS = Set.of("APROBADA", "CANCELADA");
    private static final Set<String> RECHAZADAS = Set.of("RECHAZADA");
    private static final Map<String, Set<String>> ESTADOS_POR_GRUPO = Map.of(
            "BORRADORES", BORRADORES,
            "ENPROCESO", EN_PROCESO,
            "FINALIZADAS", FINALIZADAS,
            "RECHAZADAS", RECHAZADAS);
    private static final Map<String, String> NOMBRES_TIPOS = Map.of(
            "USOINSTALACION", "Uso de cancha o instalación",
            "USO_INSTALACION", "Uso de cancha o instalación",
            "RESERVAAREA", "Uso de área o instalación",
            "RESERVA_AREA", "Uso de área o instalación");
    private static final int MAXIMO_DOCUMENTOS = 5;

    private final RepositorioSolicitud repositorioSolicitud;
    private final RepositorioSolicitudDocumento repositorioSolicitudDocumento;
    private final RepositorioDocumento repositorioDocumento;
    private final RepositorioUsuario repositorioUsuario;
    private final RepositorioArea repositorioArea;
    private final ServicioAlmacenamientoDocumentosSolicitud almacenamiento;
    private final ServicioAuditoria auditoria;
    private final ObjectMapper json;

    @Autowired
    public ServicioSolicitudesUsuario(
            RepositorioSolicitud repositorioSolicitud,
            RepositorioSolicitudDocumento repositorioSolicitudDocumento,
            RepositorioDocumento repositorioDocumento,
            RepositorioUsuario repositorioUsuario,
            RepositorioArea repositorioArea,
            ServicioAlmacenamientoDocumentosSolicitud almacenamiento,
            ServicioAuditoria auditoria,
            ObjectMapper json) {
        this.repositorioSolicitud = repositorioSolicitud;
        this.repositorioSolicitudDocumento = repositorioSolicitudDocumento;
        this.repositorioDocumento = repositorioDocumento;
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioArea = repositorioArea;
        this.almacenamiento = almacenamiento;
        this.auditoria = auditoria;
        this.json = json;
    }

    ServicioSolicitudesUsuario(RepositorioSolicitud repositorioSolicitud) {
        this(repositorioSolicitud, null, null, null, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public RespuestaProcedimientoUsoInstalacion consultarProcedimiento() {
        return new RespuestaProcedimientoUsoInstalacion(
                "USOINSTALACION",
                "Uso de cancha o instalación",
                "Gestión para solicitar el uso temporal de una cancha, área deportiva o instalación del Parque Erick Barrondo.",
                "Permitir que la administración conozca la actividad solicitada y compruebe la disponibilidad real antes de responder.",
                List.of("Instalación, fecha y horario", "Tipo y descripción de la actividad", "Cantidad estimada de personas"),
                List.of(),
                List.of("Documento de respaldo de la actividad, si ayuda a explicar la solicitud"),
                "Sin costo definido en el sistema. Si corresponde algún cobro, la administración lo informará en su respuesta.",
                "Enviar la solicitud no reserva automáticamente el espacio. La administración revisará la disponibilidad y aprobará o rechazará la gestión.");
    }

    @Transactional(readOnly = true)
    public RespuestaPaginaSolicitudesUsuario listar(
            Long idUsuario, String grupo, int numeroPagina, int tamano) {
        var estados = ESTADOS_POR_GRUPO.get(normalizarGrupo(grupo));
        if (estados == null) {
            throw new SolicitudInvalidaException("El grupo de solicitudes no es válido.");
        }
        var pagina = repositorioSolicitud.findAllByUsuarioSolicitante_IdUsuarioAndEstadoIn(
                idUsuario, estados,
                PageRequest.of(Math.max(numeroPagina, 0), Math.clamp(tamano, 1, 20),
                        Sort.by(Sort.Order.desc("actualizadoEn"), Sort.Order.desc("idSolicitud"))));
        return new RespuestaPaginaSolicitudesUsuario(
                pagina.getContent().stream().map(this::convertirListado).toList(),
                pagina.getNumber(), pagina.getSize(), pagina.getTotalElements(), pagina.getTotalPages(),
                obtenerConteos(idUsuario));
    }

    @Transactional
    public RespuestaDetalleSolicitud crearBorrador(Long idUsuario, SolicitudUsoInstalacion datos) {
        var usuario = buscarUsuario(idUsuario);
        var solicitud = repositorioSolicitud.saveAndFlush(new Solicitud(
                usuario, "USOINSTALACION", serializarDetalle(crearDetalle(usuario, datos))));
        auditar(idUsuario, "SOLICITUDBORRADORCREADO", solicitud);
        return convertirDetalle(solicitud, List.of());
    }

    @Transactional
    public RespuestaDetalleSolicitud actualizarBorrador(
            Long idSolicitud, Long idUsuario, SolicitudUsoInstalacion datos) {
        var solicitud = buscarPropia(idSolicitud, idUsuario);
        validarVersion(solicitud, datos.version());
        validarBorrador(solicitud);
        solicitud.actualizarBorrador(serializarDetalle(
                crearDetalle(solicitud.obtenerUsuarioSolicitante(), datos)));
        repositorioSolicitud.saveAndFlush(solicitud);
        auditar(idUsuario, "SOLICITUDBORRADORACTUALIZADO", solicitud);
        return convertirDetalle(solicitud, listarDocumentos(idSolicitud));
    }

    @Transactional(readOnly = true)
    public RespuestaDetalleSolicitud consultar(Long idSolicitud, Long idUsuario) {
        var solicitud = buscarPropia(idSolicitud, idUsuario);
        return convertirDetalle(solicitud, listarDocumentos(idSolicitud));
    }

    @Transactional
    public RespuestaDocumentoSolicitud agregarDocumento(
            Long idSolicitud, Long idUsuario, MultipartFile archivo) {
        var solicitud = buscarPropia(idSolicitud, idUsuario);
        validarBorrador(solicitud);
        if (repositorioSolicitudDocumento.countBySolicitud_IdSolicitud(idSolicitud) >= MAXIMO_DOCUMENTOS) {
            throw new SolicitudInvalidaException("Cada solicitud puede incluir hasta 5 documentos.");
        }
        var guardado = almacenamiento.guardar(archivo);
        eliminarArchivoSiTransaccionFalla(guardado.claveAlmacenamiento());
        var documento = repositorioDocumento.saveAndFlush(new Documento(
                solicitud.obtenerUsuarioSolicitante(), "RESPALDOACTIVIDAD",
                guardado.claveAlmacenamiento(), guardado.nombreArchivoOriginal(),
                guardado.tipoMedio(), guardado.tamanoBytes()));
        var relacion = repositorioSolicitudDocumento.saveAndFlush(new SolicitudDocumento(
                solicitud, documento, "RESPALDOACTIVIDAD"));
        auditar(idUsuario, "DOCUMENTOSOLICITUDAGREGADO", solicitud);
        return convertirDocumento(relacion, false);
    }

    @Transactional
    public void eliminarDocumento(Long idSolicitud, Long idDocumentoSolicitud, Long idUsuario) {
        var solicitud = buscarPropia(idSolicitud, idUsuario);
        validarBorrador(solicitud);
        var relacion = buscarDocumento(idSolicitud, idDocumentoSolicitud);
        var documento = relacion.obtenerDocumento();
        if (!documento.obtenerUsuarioPropietario().obtenerIdUsuario().equals(idUsuario)) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
        }
        var clave = documento.obtenerClaveAlmacenamiento();
        repositorioSolicitudDocumento.delete(relacion);
        documento.marcarEliminado();
        repositorioDocumento.save(documento);
        repositorioSolicitudDocumento.flush();
        eliminarArchivoDespuesDeConfirmar(clave);
        auditar(idUsuario, "DOCUMENTOSOLICITUDELIMINADO", solicitud);
    }

    @Transactional(readOnly = true)
    public ArchivoDocumentoSolicitud cargarDocumento(
            Long idSolicitud, Long idDocumentoSolicitud, Long idUsuario) {
        buscarPropia(idSolicitud, idUsuario);
        var documento = buscarDocumento(idSolicitud, idDocumentoSolicitud).obtenerDocumento();
        if (!"ACTIVO".equals(documento.obtenerEstado())) {
            throw new RecursoNoEncontradoException("No se encontró el documento solicitado.");
        }
        return almacenamiento.cargar(documento.obtenerClaveAlmacenamiento(),
                documento.obtenerTipoMedio(), documento.obtenerNombreArchivoOriginal());
    }

    @Transactional
    public RespuestaDetalleSolicitud enviar(Long idSolicitud, Long idUsuario, Long version) {
        var solicitud = buscarPropia(idSolicitud, idUsuario);
        validarVersion(solicitud, version);
        validarBorrador(solicitud);
        deserializarDetalle(solicitud.obtenerDetalle());
        try {
            solicitud.enviar();
        } catch (IllegalStateException excepcion) {
            throw new SolicitudInvalidaException(excepcion.getMessage());
        }
        repositorioSolicitud.saveAndFlush(solicitud);
        auditar(idUsuario, "SOLICITUDENVIADA", solicitud);
        return convertirDetalle(solicitud, listarDocumentos(idSolicitud));
    }

    private DetalleUsoInstalacionSolicitud crearDetalle(Usuario usuario, SolicitudUsoInstalacion datos) {
        if (!datos.horaFin().isAfter(datos.horaInicio())) {
            throw new SolicitudInvalidaException(
                    "La hora de finalización debe ser posterior a la hora de inicio.");
        }
        var area = repositorioArea.buscarPublicaPorCodigo(datos.codigoArea().strip())
                .orElseThrow(() -> new SolicitudInvalidaException(
                        "La cancha o instalación seleccionada no está disponible en el catálogo del parque."));
        return new DetalleUsoInstalacionSolicitud(
                area.obtenerCodigo(), area.obtenerNombre(), datos.fechaSolicitada(),
                datos.horaInicio(), datos.horaFin(), datos.tipoActividad().strip(),
                datos.cantidadPersonas(), datos.descripcion().strip(),
                new DatosSolicitanteSolicitud(
                        usuario.obtenerNombre(), usuario.obtenerApellido(), usuario.obtenerCorreoNormalizado(),
                        usuario.obtenerDpi(), usuario.obtenerCelular(), usuario.obtenerFechaNacimiento()));
    }

    private Usuario buscarUsuario(Long idUsuario) {
        return repositorioUsuario.findById(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario solicitante."));
    }

    private Solicitud buscarPropia(Long idSolicitud, Long idUsuario) {
        return repositorioSolicitud.findByIdSolicitudAndUsuarioSolicitante_IdUsuario(idSolicitud, idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la solicitud indicada."));
    }

    private SolicitudDocumento buscarDocumento(Long idSolicitud, Long idDocumentoSolicitud) {
        return repositorioSolicitudDocumento
                .findByIdSolicitudDocumentoAndSolicitud_IdSolicitud(idDocumentoSolicitud, idSolicitud)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el documento solicitado."));
    }

    private void validarBorrador(Solicitud solicitud) {
        if (!"BORRADOR".equals(solicitud.obtenerEstado())) {
            throw new ConflictoDatosException("La solicitud ya fue enviada y no puede modificarse.");
        }
    }

    private void validarVersion(Solicitud solicitud, Long version) {
        if (version == null || !version.equals(solicitud.obtenerVersion())) {
            throw new ConflictoDatosException(
                    "La solicitud cambió. Recarga la información antes de continuar.");
        }
    }

    private String serializarDetalle(DetalleUsoInstalacionSolicitud detalle) {
        try {
            return json.writeValueAsString(detalle);
        } catch (JacksonException excepcion) {
            throw new IllegalStateException("No fue posible guardar el detalle de la solicitud.", excepcion);
        }
    }

    private DetalleUsoInstalacionSolicitud deserializarDetalle(String detalle) {
        try {
            return json.readValue(detalle, DetalleUsoInstalacionSolicitud.class);
        } catch (JacksonException excepcion) {
            throw new SolicitudInvalidaException("El detalle de la solicitud no es válido.");
        }
    }

    private List<RespuestaDocumentoSolicitud> listarDocumentos(Long idSolicitud) {
        return repositorioSolicitudDocumento
                .findAllBySolicitud_IdSolicitudOrderByCreadoEnAscIdSolicitudDocumentoAsc(idSolicitud)
                .stream().filter(relacion -> "ACTIVO".equals(relacion.obtenerDocumento().obtenerEstado()))
                .map(relacion -> convertirDocumento(relacion, false)).toList();
    }

    private RespuestaDetalleSolicitud convertirDetalle(
            Solicitud solicitud, List<RespuestaDocumentoSolicitud> documentos) {
        return new RespuestaDetalleSolicitud(
                solicitud.obtenerIdSolicitud(), solicitud.obtenerTipoSolicitud(),
                nombreLegible(solicitud.obtenerTipoSolicitud()), solicitud.obtenerEstado(),
                deserializarDetalle(solicitud.obtenerDetalle()), documentos,
                solicitud.obtenerResolucion(), solicitud.obtenerCreadoEn(), solicitud.obtenerActualizadoEn(),
                solicitud.obtenerResueltoEn(), solicitud.obtenerVersion());
    }

    private RespuestaDocumentoSolicitud convertirDocumento(
            SolicitudDocumento relacion, boolean administracion) {
        var documento = relacion.obtenerDocumento();
        var prefijo = administracion ? "/api/v1/administracion" : "/api/v1";
        return new RespuestaDocumentoSolicitud(
                relacion.obtenerIdSolicitudDocumento(), relacion.obtenerCategoriaDocumento(),
                "Documento de respaldo de la actividad", relacion.esObligatorio(),
                documento.obtenerNombreArchivoOriginal(), documento.obtenerTipoMedio(),
                documento.obtenerTamanoBytes(), relacion.obtenerCreadoEn(),
                prefijo + "/solicitudes/" + relacion.obtenerSolicitud().obtenerIdSolicitud()
                        + "/documentos/" + relacion.obtenerIdSolicitudDocumento() + "/archivo");
    }

    private RespuestaSolicitudUsuario convertirListado(Solicitud solicitud) {
        return new RespuestaSolicitudUsuario(
                solicitud.obtenerIdSolicitud(), solicitud.obtenerTipoSolicitud(),
                nombreLegible(solicitud.obtenerTipoSolicitud()), solicitud.obtenerEstado(),
                solicitud.obtenerResolucion(), solicitud.obtenerCreadoEn(), solicitud.obtenerActualizadoEn(),
                solicitud.obtenerResueltoEn(), solicitud.obtenerVersion());
    }

    private RespuestaConteosSolicitudes obtenerConteos(Long idUsuario) {
        return new RespuestaConteosSolicitudes(
                contar(idUsuario, BORRADORES), contar(idUsuario, EN_PROCESO),
                contar(idUsuario, FINALIZADAS), contar(idUsuario, RECHAZADAS));
    }

    private long contar(Long idUsuario, Collection<String> estados) {
        return repositorioSolicitud.countByUsuarioSolicitante_IdUsuarioAndEstadoIn(idUsuario, estados);
    }

    private String normalizarGrupo(String grupo) {
        return grupo == null || grupo.isBlank()
                ? "ENPROCESO" : grupo.strip().toUpperCase(Locale.ROOT);
    }

    private String nombreLegible(String tipo) {
        var normalizado = tipo == null ? "" : tipo.strip().toUpperCase(Locale.ROOT);
        var conocido = NOMBRES_TIPOS.get(normalizado);
        if (conocido != null) return conocido;
        var palabras = Normalizer.normalize(normalizado, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('_', ' ').strip().toLowerCase(Locale.ROOT);
        return palabras.isBlank() ? "Solicitud del parque"
                : palabras.substring(0, 1).toUpperCase(Locale.ROOT) + palabras.substring(1);
    }

    private void auditar(Long idUsuario, String accion, Solicitud solicitud) {
        auditoria.registrar(idUsuario, accion, "SOLICITUD",
                solicitud.obtenerIdSolicitud().toString(), "EXITOSO", IdentificadorCorrelacion.actual());
    }

    private void eliminarArchivoSiTransaccionFalla(String clave) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int estado) {
                if (estado != STATUS_COMMITTED) almacenamiento.eliminar(clave);
            }
        });
    }

    private void eliminarArchivoDespuesDeConfirmar(String clave) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            almacenamiento.eliminar(clave);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() { almacenamiento.eliminar(clave); }
        });
    }
}
