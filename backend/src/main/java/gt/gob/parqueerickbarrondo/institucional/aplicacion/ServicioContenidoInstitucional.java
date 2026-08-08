package gt.gob.parqueerickbarrondo.institucional.aplicacion;

import java.util.Objects;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.institucional.api.modelo.RespuestaContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.api.modelo.SolicitudContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.dominio.ContenidoInstitucional;
import gt.gob.parqueerickbarrondo.institucional.infraestructura.persistencia.RepositorioContenidoInstitucional;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioContenidoInstitucional {

    private static final long IDENTIFICADOR_CONTENIDO = 1L;

    private final RepositorioContenidoInstitucional repositorioContenido;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioContenidoInstitucional(
            RepositorioContenidoInstitucional repositorioContenido,
            ServicioAuditoria servicioAuditoria) {
        this.repositorioContenido = repositorioContenido;
        this.servicioAuditoria = servicioAuditoria;
    }

    @Transactional(readOnly = true)
    public RespuestaContenidoInstitucional consultarPublico() {
        return convertir(obtenerContenido());
    }

    @PreAuthorize("hasAuthority('INSTITUCIONALGESTIONAR')")
    @Transactional(readOnly = true)
    public RespuestaContenidoInstitucional consultarAdministracion() {
        return convertir(obtenerContenido());
    }

    @PreAuthorize("hasAuthority('INSTITUCIONALGESTIONAR')")
    @Transactional
    public RespuestaContenidoInstitucional actualizar(
            SolicitudContenidoInstitucional solicitud,
            UsuarioSesion actor) {
        var contenido = obtenerContenido();
        if (!Objects.equals(contenido.obtenerVersion(), solicitud.version())) {
            throw new ConflictoDatosException("El contenido institucional cambió desde la última consulta. Recarga los datos.");
        }
        contenido.actualizar(
                solicitud.resumen().strip(),
                solicitud.mision().strip(),
                solicitud.vision().strip(),
                solicitud.valores().strip(),
                actor.obtenerIdUsuario());
        repositorioContenido.saveAndFlush(contenido);
        servicioAuditoria.registrar(
                actor.obtenerIdUsuario(),
                "CONTENIDOINSTITUCIONALACTUALIZADO",
                "CONTENIDOINSTITUCIONAL",
                Long.toString(IDENTIFICADOR_CONTENIDO),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
        return convertir(contenido);
    }

    private ContenidoInstitucional obtenerContenido() {
        return repositorioContenido.findById(IDENTIFICADOR_CONTENIDO)
                .orElseThrow(() -> new IllegalStateException("No existe el contenido institucional inicial."));
    }

    private RespuestaContenidoInstitucional convertir(ContenidoInstitucional contenido) {
        return new RespuestaContenidoInstitucional(
                contenido.obtenerIdContenidoInstitucional(),
                contenido.obtenerResumen(),
                contenido.obtenerMision(),
                contenido.obtenerVision(),
                contenido.obtenerValores(),
                contenido.obtenerActualizadoEn(),
                contenido.obtenerVersion());
    }
}
