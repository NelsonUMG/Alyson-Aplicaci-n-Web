package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.nio.file.Path;
import java.util.Set;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ArchivoDocumentoSolicitud;
import gt.gob.parqueerickbarrondo.solicitudes.aplicacion.ServicioAlmacenamientoDocumentosSolicitud;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioFormularioEvento {
    private final RepositorioEvento eventos;
    private final ServicioAuditoria auditoria;
    private final ServicioAlmacenamientoDocumentosSolicitud archivos;

    public ServicioFormularioEvento(RepositorioEvento eventos, ServicioAuditoria auditoria,
            @Value("${almacenamiento.eventos.ruta}") String ruta) {
        this.eventos = eventos;
        this.auditoria = auditoria;
        this.archivos = new ServicioAlmacenamientoDocumentosSolicitud(Path.of(ruta, "formularios").toString());
    }

    public record RespuestaFormulario(String nombreFormularioInscripcion, String urlFormularioInscripcion, Long version) { }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaFormulario guardar(Long idEvento, MultipartFile archivo, UsuarioSesion actor) {
        var evento = buscar(idEvento);
        validarEditable(evento);
        var documento = archivos.guardarPdf(archivo);
        var anterior = evento.obtenerClaveFormularioInscripcion();
        limpiarTrasTransaccion(documento.claveAlmacenamiento(), anterior);
        evento.asignarFormularioInscripcion(documento.claveAlmacenamiento(), documento.nombreArchivoOriginal());
        eventos.saveAndFlush(evento);
        auditoria.registrar(actor.obtenerIdUsuario(), "FORMULARIOEVENTOACTUALIZADO", "EVENTO", idEvento.toString(), "EXITOSO", null);
        return new RespuestaFormulario(evento.obtenerNombreFormularioInscripcion(),
                "/api/v1/administracion/eventos/" + idEvento + "/formulario-inscripcion", evento.obtenerVersion());
    }

    @PreAuthorize("hasAuthority('EVENTOACTUALIZAR')")
    @Transactional
    public RespuestaFormulario eliminar(Long idEvento, UsuarioSesion actor) {
        var evento = buscar(idEvento);
        validarEditable(evento);
        var anterior = evento.obtenerClaveFormularioInscripcion();
        evento.asignarFormularioInscripcion(null, null);
        eventos.saveAndFlush(evento);
        limpiarTrasTransaccion(null, anterior);
        auditoria.registrar(actor.obtenerIdUsuario(), "FORMULARIOEVENTOELIMINADO", "EVENTO", idEvento.toString(), "EXITOSO", null);
        return new RespuestaFormulario(null, null, evento.obtenerVersion());
    }

    @PreAuthorize("hasAuthority('EVENTOLEER')")
    @Transactional(readOnly = true)
    public ArchivoDocumentoSolicitud cargarAdministrado(Long idEvento) { return cargar(buscar(idEvento)); }

    @Transactional(readOnly = true)
    public ArchivoDocumentoSolicitud cargarPublico(String identificadorUrl) {
        var evento = eventos.buscarPublicoPorIdentificadorUrl(identificadorUrl, Set.of("PUBLICADO", "CERRADO", "FINALIZADO"))
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el curso solicitado."));
        return cargar(evento);
    }

    private ArchivoDocumentoSolicitud cargar(Evento evento) {
        if (evento.obtenerClaveFormularioInscripcion() == null)
            throw new RecursoNoEncontradoException("Este curso aún no tiene un formulario disponible.");
        return archivos.cargar(evento.obtenerClaveFormularioInscripcion(), "application/pdf", evento.obtenerNombreFormularioInscripcion());
    }

    private Evento buscar(Long id) {
        return eventos.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el curso solicitado."));
    }

    private void validarEditable(Evento evento) {
        if (!Set.of("BORRADOR", "PUBLICADO", "CERRADO").contains(evento.obtenerEstado()))
            throw new SolicitudInvalidaException("Este curso ya no admite cambios de formulario.");
    }

    private void limpiarTrasTransaccion(String nuevo, String anterior) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int estado) {
                var clave = estado == STATUS_COMMITTED ? anterior : nuevo;
                if (clave != null) {
                    try { archivos.eliminar(clave); }
                    catch (RuntimeException error) { org.slf4j.LoggerFactory.getLogger(ServicioFormularioEvento.class).warn("No se pudo limpiar un archivo de formulario."); }
                }
            }
        });
    }
}
