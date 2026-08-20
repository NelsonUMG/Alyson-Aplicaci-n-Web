package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.util.Locale;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaPersonaInscritaReporte;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaResumenInscripcionesCurso;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioReportesInscripciones {

    private final RepositorioEvento repositorioEvento;
    private final RepositorioInscripcionEvento repositorioInscripcion;

    public ServicioReportesInscripciones(
            RepositorioEvento repositorioEvento,
            RepositorioInscripcionEvento repositorioInscripcion) {
        this.repositorioEvento = repositorioEvento;
        this.repositorioInscripcion = repositorioInscripcion;
    }

    @PreAuthorize("hasAuthority('REPORTELEER')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaResumenInscripcionesCurso> listarCursos(
            String busqueda,
            int numeroPagina,
            int tamano) {
        var pagina = repositorioEvento.buscarAdministrados(
                normalizarBusqueda(busqueda),
                "",
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.asc("titulo"), Sort.Order.desc("idEvento"))));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream()
                        .map(evento -> new RespuestaResumenInscripcionesCurso(
                                evento.obtenerIdEvento(),
                                evento.obtenerTitulo(),
                                evento.obtenerLugar(),
                                evento.obtenerIniciaEn(),
                                evento.obtenerFinalizaEn(),
                                evento.obtenerConfiguracionGruposJson(),
                                evento.obtenerEstado(),
                                evento.obtenerCantidadOcupada()))
                        .toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('REPORTELEER')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaPersonaInscritaReporte> listarPersonas(
            Long idEvento,
            String busqueda,
            int numeroPagina,
            int tamano) {
        if (!repositorioEvento.existsById(idEvento)) {
            throw new RecursoNoEncontradoException("No se encontró el curso o actividad solicitado.");
        }
        var pagina = repositorioInscripcion.buscarAdministradas(
                idEvento,
                normalizarBusqueda(busqueda),
                "CONFIRMADA",
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.asc("usuario.apellido"),
                                Sort.Order.asc("usuario.nombre"),
                                Sort.Order.asc("idInscripcionEvento"))));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream().map(inscripcion -> {
                    var usuario = inscripcion.obtenerUsuario();
                    return new RespuestaPersonaInscritaReporte(
                            inscripcion.obtenerIdInscripcionEvento(),
                            usuario.obtenerIdUsuario(),
                            usuario.obtenerNombre(),
                            usuario.obtenerApellido(),
                            usuario.obtenerCorreoNormalizado(),
                            inscripcion.obtenerGrupoSeleccionadoCodigo(),
                            inscripcion.obtenerConfirmadaEn());
                }).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    private String normalizarBusqueda(String busqueda) {
        if (busqueda == null) {
            return "";
        }
        if (busqueda.length() > 100) {
            throw new SolicitudInvalidaException("La búsqueda no puede superar 100 caracteres.");
        }
        return busqueda.strip().toLowerCase(Locale.ROOT);
    }
}
