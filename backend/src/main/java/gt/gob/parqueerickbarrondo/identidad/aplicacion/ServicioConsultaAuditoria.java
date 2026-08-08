package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaEventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPagina;
import gt.gob.parqueerickbarrondo.identidad.dominio.EventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioEventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioConsultaAuditoria {

    private static final Set<String> RESULTADOS_VALIDOS = Set.of("EXITOSO", "DENEGADO", "FALLIDO");

    private final RepositorioEventoAuditoria repositorioEventoAuditoria;
    private final RepositorioUsuario repositorioUsuario;

    public ServicioConsultaAuditoria(
            RepositorioEventoAuditoria repositorioEventoAuditoria,
            RepositorioUsuario repositorioUsuario) {
        this.repositorioEventoAuditoria = repositorioEventoAuditoria;
        this.repositorioUsuario = repositorioUsuario;
    }

    @PreAuthorize("hasAuthority('REPORTELEER')")
    @Transactional(readOnly = true)
    public RespuestaPagina<RespuestaEventoAuditoria> listar(
            String accion,
            String tipoRecurso,
            String idRecurso,
            String resultado,
            Long idUsuarioActor,
            Instant desde,
            Instant hasta,
            int numeroPagina,
            int tamano) {
        var accionNormalizada = normalizarFiltro(accion, 80, "La acción");
        var recursoNormalizado = normalizarFiltro(tipoRecurso, 80, "El tipo de recurso");
        var identificadorNormalizado = normalizarFiltro(idRecurso, 80, "El identificador del recurso");
        var resultadoNormalizado = normalizarFiltro(resultado, 32, "El resultado");
        if (!resultadoNormalizado.isEmpty() && !RESULTADOS_VALIDOS.contains(resultadoNormalizado)) {
            throw new SolicitudInvalidaException("El resultado de auditoría no es válido.");
        }
        if (idUsuarioActor != null && idUsuarioActor <= 0) {
            throw new SolicitudInvalidaException("El identificador del actor no es válido.");
        }
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new SolicitudInvalidaException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        var pagina = repositorioEventoAuditoria.buscarPagina(
                accionNormalizada,
                recursoNormalizado,
                identificadorNormalizado,
                resultadoNormalizado,
                idUsuarioActor,
                desde,
                hasta,
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(
                                Sort.Order.desc("ocurridoEn"),
                                Sort.Order.desc("idEventoAuditoria"))));
        var identificadoresActores = pagina.getContent().stream()
                .map(EventoAuditoria::obtenerIdUsuarioActor)
                .filter(identificador -> identificador != null)
                .collect(Collectors.toSet());
        Map<Long, Usuario> actores = identificadoresActores.isEmpty()
                ? Map.of()
                : repositorioUsuario.findAllById(identificadoresActores).stream()
                        .collect(Collectors.toMap(Usuario::obtenerIdUsuario, Function.identity()));
        return new RespuestaPagina<>(
                pagina.getContent().stream()
                        .map(evento -> convertir(evento, actores.get(evento.obtenerIdUsuarioActor())))
                        .toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    private String normalizarFiltro(String valor, int longitudMaxima, String nombre) {
        if (valor == null || valor.isBlank()) {
            return "";
        }
        if (valor.length() > longitudMaxima) {
            throw new SolicitudInvalidaException(nombre + " supera la longitud permitida.");
        }
        return valor.strip().toUpperCase(Locale.ROOT);
    }

    private RespuestaEventoAuditoria convertir(EventoAuditoria evento, Usuario actor) {
        var nombreActor = actor == null
                ? "Sistema"
                : actor.obtenerNombre() + " " + actor.obtenerApellido();
        return new RespuestaEventoAuditoria(
                evento.obtenerIdEventoAuditoria(),
                evento.obtenerIdUsuarioActor(),
                nombreActor,
                evento.obtenerCodigoAccion(),
                evento.obtenerTipoRecurso(),
                evento.obtenerIdRecurso(),
                evento.obtenerResultado(),
                evento.obtenerIdCorrelacion(),
                evento.obtenerOcurridoEn());
    }
}
