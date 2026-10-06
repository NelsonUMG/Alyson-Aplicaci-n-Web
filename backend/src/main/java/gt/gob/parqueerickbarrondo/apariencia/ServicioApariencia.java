package gt.gob.parqueerickbarrondo.apariencia;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ArchivoImagenPublica;
import gt.gob.parqueerickbarrondo.publicaciones.aplicacion.ServicioAlmacenamientoImagenesPublicacion;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioApariencia {
    private static final int ANCHO_MINIMO_PORTADA = 1280;
    private static final int ALTO_MINIMO_PORTADA = 720;
    private static final double RELACION_PORTADA = 16d / 9d;
    private static final double TOLERANCIA_RELACION_PORTADA = 0.03d;

    private final JdbcTemplate jdbc;
    private final ServicioAlmacenamientoImagenesPublicacion imagenes;
    private final ServicioAuditoria auditoria;

    public ServicioApariencia(JdbcTemplate jdbc,
            ServicioAlmacenamientoImagenesPublicacion imagenes, ServicioAuditoria auditoria) {
        this.jdbc = jdbc;
        this.imagenes = imagenes;
        this.auditoria = auditoria;
    }

    private record Fila(String color, String clave, String tipo, long version) { }

    private Fila leer() {
        return jdbc.queryForObject("SELECT ColorPrincipal, ClavePortada, TipoPortada, Version FROM dbo.ConfiguracionApariencia WHERE Id=1",
                (rs, n) -> new Fila(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4)));
    }

    @Transactional(readOnly = true)
    public Apariencia consultar() {
        var fila = leer();
        return new Apariencia(fila.color(),
                fila.clave() == null ? null : "/api/v1/publico/apariencia/portada?v=" + fila.version(), fila.version());
    }

    @Transactional(readOnly = true)
    public ArchivoImagenPublica portada() {
        var fila = leer();
        var recurso = imagenes.cargar(fila.clave());
        try {
            return new ArchivoImagenPublica(recurso, fila.tipo(), recurso.contentLength());
        } catch (java.io.IOException error) {
            throw new SolicitudInvalidaException("No fue posible leer la portada.");
        }
    }

    @PreAuthorize("hasAuthority('INSTITUCIONALGESTIONAR')")
    @Transactional
    public Apariencia guardar(Apariencia.Cambio cambio, MultipartFile archivo, UsuarioSesion actor) {
        var anterior = leer();
        if (anterior.version() != cambio.version()) {
            throw new ConflictoDatosException("Otra persona actualizó la página principal. Recarga la configuración antes de guardar.");
        }
        String clave = cambio.quitarPortada() ? null : anterior.clave();
        String tipo = cambio.quitarPortada() ? null : anterior.tipo();
        if (archivo != null && !archivo.isEmpty()) {
            var nueva = imagenes.guardar(archivo);
            var relacion = (double) nueva.anchoPixeles() / nueva.altoPixeles();
            if (nueva.anchoPixeles() < ANCHO_MINIMO_PORTADA
                    || nueva.altoPixeles() < ALTO_MINIMO_PORTADA
                    || Math.abs(relacion - RELACION_PORTADA) > TOLERANCIA_RELACION_PORTADA) {
                imagenes.eliminar(nueva.claveAlmacenamiento());
                throw new SolicitudInvalidaException(
                        "La portada debe usar una proporción 16:9 y tener al menos 1280 × 720 píxeles. Se recomienda 1920 × 1080.");
            }
            clave = nueva.claveAlmacenamiento();
            tipo = nueva.tipoMedio();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int estado) {
                    if (estado != STATUS_COMMITTED) imagenes.eliminar(nueva.claveAlmacenamiento());
                }
            });
        }
        int actualizadas = jdbc.update("UPDATE dbo.ConfiguracionApariencia SET ColorPrincipal=?, ClavePortada=?, TipoPortada=?, Version=Version+1 WHERE Id=1 AND Version=?",
                cambio.colorPrincipal(), clave, tipo, cambio.version());
        if (actualizadas != 1) throw new ConflictoDatosException("La configuración cambió. Recarga antes de guardar.");
        if (anterior.clave() != null && !anterior.clave().equals(clave)) {
            var claveAnterior = anterior.clave();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int estado) {
                    if (estado == STATUS_COMMITTED) imagenes.eliminar(claveAnterior);
                }
            });
        }
        auditoria.registrar(actor.obtenerIdUsuario(), "APARIENCIAACTUALIZADA", "APARIENCIA", "1", "EXITOSO", IdentificadorCorrelacion.actual());
        return consultar();
    }
}
