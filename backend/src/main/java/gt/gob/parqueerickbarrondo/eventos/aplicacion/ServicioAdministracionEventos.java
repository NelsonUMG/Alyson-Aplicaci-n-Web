package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaEventoAdministrado;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaInscripcionAdministrada;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaRequisitoEventoAdministrado;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudEvento;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudRequisitoEvento;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.RequisitoEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioAdministracionEventos {

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "BORRADOR", "PUBLICADO", "CERRADO", "CANCELADO", "FINALIZADO");

    private final RepositorioEvento repositorioEvento;
    private final RepositorioInscripcionEvento repositorioInscripcion;
    private final RepositorioUsuario repositorioUsuario;
    private final ServicioAuditoria servicioAuditoria;
    private final ServicioAlmacenamientoImagenesEvento servicioAlmacenamiento;
    private final ObjectMapper serializadorJson;

    public ServicioAdministracionEventos(
            RepositorioEvento repositorioEvento,
            RepositorioInscripcionEvento repositorioInscripcion,
            RepositorioUsuario repositorioUsuario,
            ServicioAuditoria servicioAuditoria,
            ServicioAlmacenamientoImagenesEvento servicioAlmacenamiento,
            ObjectMapper serializadorJson) {
        this.repositorioEvento = repositorioEvento;
        this.repositorioInscripcion = repositorioInscripcion;
        this.repositorioUsuario = repositorioUsuario;
        this.servicioAuditoria = servicioAuditoria;
        this.servicioAlmacenamiento = servicioAlmacenamiento;
        this.serializadorJson = serializadorJson;
    }

    @PreAuthorize("hasAuthority('EVENTOLEER')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaEventoAdministrado> listar(
            String busqueda,
            String estado,
            String orden,
            int numeroPagina,
            int tamano) {
        var pagina = repositorioEvento.buscarAdministrados(
                normalizarFiltro(busqueda, 100, "La búsqueda no puede superar 100 caracteres."),
                normalizarEstado(estado),
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        obtenerOrden(orden)));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream().map(this::convertirEvento).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('EVENTOLEER')")
    @Transactional(readOnly = true)
    public RespuestaEventoAdministrado consultar(Long idEvento) {
        return convertirEvento(buscarEvento(idEvento));
    }

    @PreAuthorize("hasAuthority('EVENTOCREAR')")
    @Transactional
    public RespuestaEventoAdministrado crear(SolicitudEvento solicitud, UsuarioSesion actor) {
        validarDatos(solicitud, 0);
        var creador = repositorioUsuario.findById(actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario creador."));
        var evento = new Evento(
                creador,
                solicitud.titulo().strip(),
                generarIdentificadorUrl(solicitud.titulo()),
                solicitud.descripcion().strip(),
                normalizarOpcional(solicitud.lugar()),
                solicitud.iniciaEn(),
                solicitud.finalizaEn(),
                solicitud.inscripcionAbreEn(),
                solicitud.inscripcionCierraEn(),
                solicitud.capacidadTotal(),
                normalizarFormulario(solicitud.esquemaFormularioJson()));
        reemplazarRequisitos(evento, solicitud.requisitos());
        evento = repositorioEvento.saveAndFlush(evento);
        auditar(actor, "EVENTOCREADO", evento.obtenerIdEvento());
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado actualizar(
            Long idEvento,
            SolicitudEvento solicitud,
            UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarVersion(evento.obtenerVersion(), solicitud.version());
        validarEditable(evento);
        validarDatos(solicitud, evento.obtenerCantidadOcupada());
        evento.actualizar(
                solicitud.titulo().strip(),
                solicitud.descripcion().strip(),
                normalizarOpcional(solicitud.lugar()),
                solicitud.iniciaEn(),
                solicitud.finalizaEn(),
                solicitud.inscripcionAbreEn(),
                solicitud.inscripcionCierraEn(),
                solicitud.capacidadTotal(),
                normalizarFormulario(solicitud.esquemaFormularioJson()));
        reemplazarRequisitos(evento, solicitud.requisitos());
        repositorioEvento.saveAndFlush(evento);
        auditar(actor, "EVENTOACTUALIZADO", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado publicar(Long idEvento, Long version, UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarVersion(evento.obtenerVersion(), version);
        if (!"BORRADOR".equals(evento.obtenerEstado())) {
            throw new SolicitudInvalidaException("Solo un evento en borrador puede publicarse.");
        }
        evento.publicar();
        repositorioEvento.saveAndFlush(evento);
        auditar(actor, "EVENTOPUBLICADO", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado cerrar(Long idEvento, Long version, UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarVersion(evento.obtenerVersion(), version);
        if (!"PUBLICADO".equals(evento.obtenerEstado())) {
            throw new SolicitudInvalidaException("Solo un evento publicado puede cerrarse.");
        }
        evento.cerrar();
        repositorioEvento.saveAndFlush(evento);
        auditar(actor, "EVENTOCERRADO", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado cancelar(Long idEvento, Long version, UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarVersion(evento.obtenerVersion(), version);
        if (!Set.of("BORRADOR", "PUBLICADO", "CERRADO").contains(evento.obtenerEstado())) {
            throw new SolicitudInvalidaException("El evento no puede cancelarse desde su estado actual.");
        }
        evento.cancelar();
        repositorioEvento.saveAndFlush(evento);
        auditar(actor, "EVENTOCANCELADO", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado finalizar(Long idEvento, Long version, UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarVersion(evento.obtenerVersion(), version);
        if (!Set.of("PUBLICADO", "CERRADO").contains(evento.obtenerEstado())) {
            throw new SolicitudInvalidaException("El evento no puede finalizarse desde su estado actual.");
        }
        if (evento.obtenerIniciaEn().isAfter(Instant.now())) {
            throw new SolicitudInvalidaException("Un evento no puede finalizar antes de su fecha de inicio.");
        }
        evento.finalizar();
        repositorioEvento.saveAndFlush(evento);
        auditar(actor, "EVENTOFINALIZADO", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado agregarImagen(
            Long idEvento,
            MultipartFile archivo,
            UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarEditable(evento);
        var anterior = evento.obtenerClaveImagen();
        var almacenada = servicioAlmacenamiento.guardar(archivo);
        eliminarArchivoSiTransaccionFalla(almacenada.claveAlmacenamiento());
        evento.establecerClaveImagen(almacenada.claveAlmacenamiento());
        repositorioEvento.saveAndFlush(evento);
        eliminarArchivoAnteriorDespuesDeConfirmar(anterior);
        auditar(actor, "IMAGENEVENTOACTUALIZADA", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaEventoAdministrado eliminarImagen(Long idEvento, UsuarioSesion actor) {
        var evento = buscarEvento(idEvento);
        validarEditable(evento);
        var anterior = evento.obtenerClaveImagen();
        if (anterior == null) {
            throw new RecursoNoEncontradoException("El evento no tiene una imagen registrada.");
        }
        evento.establecerClaveImagen(null);
        repositorioEvento.saveAndFlush(evento);
        eliminarArchivoAnteriorDespuesDeConfirmar(anterior);
        auditar(actor, "IMAGENEVENTOELIMINADA", idEvento);
        return convertirEvento(evento);
    }

    @PreAuthorize("hasAuthority('EVENTOLEER')")
    @Transactional(readOnly = true)
    public ArchivoImagenEvento cargarImagen(Long idEvento) {
        var evento = buscarEvento(idEvento);
        if (evento.obtenerClaveImagen() == null) {
            throw new RecursoNoEncontradoException("El evento no tiene una imagen registrada.");
        }
        return servicioAlmacenamiento.cargar(evento.obtenerClaveImagen());
    }

    @PreAuthorize("hasAuthority('EVENTOGESTIONARINSCRIPCIONES')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaInscripcionAdministrada> listarInscripciones(
            Long idEvento,
            String busqueda,
            String estado,
            int numeroPagina,
            int tamano) {
        if (!repositorioEvento.existsById(idEvento)) {
            throw new RecursoNoEncontradoException("No se encontró el evento solicitado.");
        }
        var estadoNormalizado = estado == null || estado.isBlank()
                ? ""
                : estado.strip().toUpperCase(Locale.ROOT);
        if (!estadoNormalizado.isEmpty() && !Set.of("CONFIRMADA", "CANCELADA").contains(estadoNormalizado)) {
            throw new SolicitudInvalidaException("El estado de inscripción solicitado no es válido.");
        }
        var pagina = repositorioInscripcion.buscarAdministradas(
                idEvento,
                normalizarFiltro(busqueda, 100, "La búsqueda no puede superar 100 caracteres."),
                estadoNormalizado,
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.desc("creadoEn"), Sort.Order.desc("idInscripcionEvento"))));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream().map(inscripcion -> {
                    var usuario = inscripcion.obtenerUsuario();
                    return new RespuestaInscripcionAdministrada(
                            inscripcion.obtenerIdInscripcionEvento(),
                            usuario.obtenerIdUsuario(),
                            usuario.obtenerNombre(),
                            usuario.obtenerApellido(),
                            usuario.obtenerCorreoNormalizado(),
                            inscripcion.obtenerEstado(),
                            inscripcion.obtenerRequisitosAceptadosEn(),
                            inscripcion.obtenerConfirmadaEn(),
                            inscripcion.obtenerCanceladaEn(),
                            inscripcion.obtenerMotivoCancelacion(),
                            inscripcion.obtenerCreadoEn(),
                            inscripcion.obtenerActualizadoEn());
                }).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    private Evento buscarEvento(Long idEvento) {
        return repositorioEvento.buscarAdministradoPorId(idEvento)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el evento solicitado."));
    }

    private void reemplazarRequisitos(Evento evento, List<SolicitudRequisitoEvento> solicitudes) {
        var requisitos = solicitudes.stream()
                .map(solicitud -> new RequisitoEvento(
                        evento,
                        solicitud.descripcion().strip(),
                        solicitud.obligatorio(),
                        (short) solicitud.ordenVisualizacion()))
                .toList();
        evento.reemplazarRequisitos(requisitos);
    }

    private void validarDatos(SolicitudEvento solicitud, int cantidadOcupada) {
        if (solicitud.finalizaEn() != null && solicitud.finalizaEn().isBefore(solicitud.iniciaEn())) {
            throw new SolicitudInvalidaException("La fecha de finalización no puede ser anterior al inicio.");
        }
        if (solicitud.inscripcionAbreEn() != null && solicitud.inscripcionCierraEn() != null
                && solicitud.inscripcionCierraEn().isBefore(solicitud.inscripcionAbreEn())) {
            throw new SolicitudInvalidaException(
                    "El cierre de inscripción no puede ser anterior a su apertura.");
        }
        if (solicitud.inscripcionCierraEn() != null
                && solicitud.inscripcionCierraEn().isAfter(solicitud.iniciaEn())) {
            throw new SolicitudInvalidaException(
                    "El periodo de inscripción debe cerrar antes de iniciar el evento.");
        }
        if (solicitud.capacidadTotal() < cantidadOcupada) {
            throw new SolicitudInvalidaException(
                    "La capacidad total no puede ser menor que las inscripciones confirmadas.");
        }
        normalizarFormulario(solicitud.esquemaFormularioJson());
    }

    private String normalizarFormulario(String contenido) {
        if (contenido == null || contenido.isBlank()) {
            return null;
        }
        var normalizado = contenido.strip();
        try {
            var estructura = serializadorJson.readTree(normalizado);
            if (estructura == null || !estructura.isObject()) {
                throw new SolicitudInvalidaException("El formulario debe ser un objeto JSON válido.");
            }
            return normalizado;
        } catch (JacksonException excepcion) {
            throw new SolicitudInvalidaException("El formulario debe contener JSON válido.");
        }
    }

    private String generarIdentificadorUrl(String titulo) {
        var sinAcentos = Normalizer.normalize(titulo, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        var base = sinAcentos.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (base.isBlank()) {
            base = "evento";
        }
        base = base.substring(0, Math.min(base.length(), 170));
        if (!repositorioEvento.existsByIdentificadorUrl(base)) {
            return base;
        }
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String normalizarEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return "";
        }
        var normalizado = estado.strip().toUpperCase(Locale.ROOT);
        if (!ESTADOS_VALIDOS.contains(normalizado)) {
            throw new SolicitudInvalidaException("El estado solicitado no es válido.");
        }
        return normalizado;
    }

    private String normalizarFiltro(String valor, int maximo, String mensaje) {
        if (valor == null) {
            return "";
        }
        if (valor.length() > maximo) {
            throw new SolicitudInvalidaException(mensaje);
        }
        return valor.strip();
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }

    private Sort obtenerOrden(String orden) {
        var normalizado = orden == null ? "" : orden.strip().toUpperCase(Locale.ROOT);
        return switch (normalizado) {
            case "TITULO" -> Sort.by(Sort.Order.asc("titulo"), Sort.Order.desc("idEvento"));
            case "FECHA" -> Sort.by(Sort.Order.asc("iniciaEn"), Sort.Order.asc("idEvento"));
            case "ESTADO" -> Sort.by(Sort.Order.asc("estado"), Sort.Order.desc("idEvento"));
            case "", "ACTUALIZACION" -> Sort.by(
                    Sort.Order.desc("actualizadoEn"), Sort.Order.desc("idEvento"));
            default -> throw new SolicitudInvalidaException("El orden solicitado no es válido.");
        };
    }

    private void validarVersion(Long versionActual, Long versionSolicitada) {
        if (versionSolicitada == null || !versionActual.equals(versionSolicitada)) {
            throw new ConflictoDatosException(
                    "El evento cambió desde la última consulta. Recarga los datos.");
        }
    }

    private void validarEditable(Evento evento) {
        if (Set.of("CANCELADO", "FINALIZADO").contains(evento.obtenerEstado())) {
            throw new SolicitudInvalidaException(
                    "Un evento cancelado o finalizado no puede modificarse.");
        }
    }

    private RespuestaEventoAdministrado convertirEvento(Evento evento) {
        var tieneImagen = evento.obtenerClaveImagen() != null;
        return new RespuestaEventoAdministrado(
                evento.obtenerIdEvento(),
                evento.obtenerTitulo(),
                evento.obtenerIdentificadorUrl(),
                evento.obtenerDescripcion(),
                evento.obtenerLugar(),
                evento.obtenerIniciaEn(),
                evento.obtenerFinalizaEn(),
                evento.obtenerInscripcionAbreEn(),
                evento.obtenerInscripcionCierraEn(),
                evento.obtenerCapacidadTotal(),
                evento.obtenerCantidadOcupada(),
                Math.max(evento.obtenerCapacidadTotal() - evento.obtenerCantidadOcupada(), 0),
                evento.obtenerEstado(),
                evento.obtenerEsquemaFormularioJson(),
                evento.obtenerRequisitos().stream()
                        .map(requisito -> new RespuestaRequisitoEventoAdministrado(
                                requisito.obtenerIdRequisitoEvento(),
                                requisito.obtenerDescripcion(),
                                requisito.esObligatorio(),
                                requisito.obtenerOrdenVisualizacion()))
                        .toList(),
                tieneImagen,
                tieneImagen ? "/api/v1/administracion/eventos/" + evento.obtenerIdEvento() + "/imagen" : null,
                evento.obtenerCreadoEn(),
                evento.obtenerActualizadoEn(),
                evento.obtenerVersion());
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

    private void auditar(UsuarioSesion actor, String accion, Long idEvento) {
        servicioAuditoria.registrar(
                actor.obtenerIdUsuario(),
                accion,
                "EVENTO",
                idEvento.toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }
}
