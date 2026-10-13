package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.util.Locale;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaPersonaInscritaReporte;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaResumenInscripcionesCurso;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaDetalleParticipante;
import tools.jackson.databind.ObjectMapper;
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
    private final ObjectMapper serializadorJson = new ObjectMapper();

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
                            inscripcion.obtenerNombreParticipante(),
                            inscripcion.obtenerApellidoParticipante(),
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

    @PreAuthorize("hasAuthority('REPORTELEER')")
    @Transactional(readOnly = true)
    public RespuestaDetalleParticipante consultarParticipante(
            Long idEvento, Long idInscripcion) {
        var inscripcion = repositorioInscripcion.findById(idInscripcion)
                .filter(i -> idEvento.equals(i.obtenerEvento().obtenerIdEvento()))
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la inscripción solicitada."));
        var requisitos = new java.util.LinkedHashMap<String, String>();
        String foto = null;
        var respuestas = inscripcion.obtenerRespuestasFormularioJson();
        if (respuestas != null) {
            var valores = serializadorJson.readTree(respuestas);
            var esquema = inscripcion.obtenerEvento().obtenerEsquemaFormularioJson();
            if (esquema != null) {
                var campos = serializadorJson.readTree(esquema).path("campos");
                for (var campo : campos) {
                    var valor = valores.path(campo.path("id").asText()).asText("");
                    if (esFotografia(valor)) foto = valor;
                    else if (!valor.isBlank()) requisitos.put(campo.path("etiqueta").asText(), valor);
                }
            }
            var fotoAdicional = valores.path("_fotoParticipante").asText("");
            if (esFotografia(fotoAdicional)) foto = fotoAdicional;
        }
        var usuario = inscripcion.obtenerUsuario();
        return new RespuestaDetalleParticipante(
                inscripcion.obtenerNombreParticipante(), inscripcion.obtenerApellidoParticipante(),
                inscripcion.obtenerNacimientoParticipante(), inscripcion.esInscripcionDelTitular(),
                usuario.obtenerNombre() + " " + usuario.obtenerApellido(), usuario.obtenerCorreoNormalizado(), foto, requisitos);
    }

    private boolean esFotografia(String valor) {
        return valor.startsWith("data:image/jpeg;base64,") || valor.startsWith("data:image/png;base64,");
    }
}
