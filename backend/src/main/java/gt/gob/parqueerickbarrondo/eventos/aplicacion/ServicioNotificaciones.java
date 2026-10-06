package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaNotificacion;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaNotificaciones;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioNotificacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioNotificaciones {
    private final RepositorioNotificacion repositorio;

    public ServicioNotificaciones(RepositorioNotificacion repositorio) {
        this.repositorio = repositorio;
    }

    @Transactional(readOnly = true)
    public RespuestaNotificaciones listar(Long idUsuario) {
        var contenido = repositorio
                .findTop20ByUsuarioDestinatario_IdUsuarioOrderByCreadoEnDescIdNotificacionDesc(idUsuario)
                .stream().map(this::convertir).toList();
        return new RespuestaNotificaciones(
                repositorio.countByUsuarioDestinatario_IdUsuarioAndLeidaEnIsNull(idUsuario), contenido);
    }

    @Transactional
    public RespuestaNotificacion marcarLeida(Long idUsuario, Long idNotificacion) {
        var notificacion = repositorio
                .findByIdNotificacionAndUsuarioDestinatario_IdUsuario(idNotificacion, idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la notificación."));
        notificacion.marcarLeida();
        return convertir(repositorio.saveAndFlush(notificacion));
    }

    private RespuestaNotificacion convertir(gt.gob.parqueerickbarrondo.eventos.dominio.Notificacion notificacion) {
        return new RespuestaNotificacion(
                notificacion.obtenerIdNotificacion(), notificacion.obtenerTipoNotificacion(),
                notificacion.obtenerAsunto(), notificacion.obtenerLeidaEn() != null,
                notificacion.obtenerCreadoEn());
    }
}
