package gt.gob.parqueerickbarrondo.portalpublico.aplicacion;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaAreaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaDetalleEvento;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaDetallePublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaEventoPublico;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaImagenPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaImagenEventoPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPublicacionPublica;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaRequisitoEvento;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaResumenBicicletas;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.ImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.ImagenEvento;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Publicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioArea;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioBicicleta;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenEvento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioPublicacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioPortalPublico {

    private static final Set<String> ESTADOS_EVENTO_PUBLICOS = Set.of(
            "PUBLICADO", "CERRADO", "CANCELADO", "FINALIZADO");

    private final RepositorioPublicacion repositorioPublicacion;
    private final RepositorioCategoriaPublicacion repositorioCategoriaPublicacion;
    private final RepositorioEvento repositorioEvento;
    private final RepositorioArea repositorioArea;
    private final RepositorioBicicleta repositorioBicicleta;
    private final RepositorioImagenPublicacion repositorioImagenPublicacion;
    private final RepositorioImagenEvento repositorioImagenEvento;

    public ServicioPortalPublico(
            RepositorioPublicacion repositorioPublicacion,
            RepositorioCategoriaPublicacion repositorioCategoriaPublicacion,
            RepositorioEvento repositorioEvento,
            RepositorioArea repositorioArea,
            RepositorioBicicleta repositorioBicicleta,
            RepositorioImagenPublicacion repositorioImagenPublicacion,
            RepositorioImagenEvento repositorioImagenEvento) {
        this.repositorioPublicacion = repositorioPublicacion;
        this.repositorioCategoriaPublicacion = repositorioCategoriaPublicacion;
        this.repositorioEvento = repositorioEvento;
        this.repositorioArea = repositorioArea;
        this.repositorioBicicleta = repositorioBicicleta;
        this.repositorioImagenPublicacion = repositorioImagenPublicacion;
        this.repositorioImagenEvento = repositorioImagenEvento;
    }

    @Transactional(readOnly = true)
    public List<RespuestaCategoriaPublicacion> listarCategoriasPublicacion() {
        return repositorioCategoriaPublicacion.findAllByActivaTrueOrderByOrdenVisualizacionAscNombreAsc().stream()
                .map(categoria -> new RespuestaCategoriaPublicacion(
                        categoria.obtenerCodigo(), categoria.obtenerNombre()))
                .toList();
    }

    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaPublicacionPublica> listarPublicaciones(
            String busqueda,
            String categoria,
            LocalDate fechaDesde,
            LocalDate fechaHasta,
            int numeroPagina,
            int tamano) {
        var busquedaSegura = normalizarFiltro(busqueda, 100, "La búsqueda no puede superar 100 caracteres.");
        var categoriaSegura = normalizarFiltro(
                categoria, 64, "La categoría no puede superar 64 caracteres.").toUpperCase(Locale.ROOT);
        if (fechaDesde != null && fechaHasta != null && fechaDesde.isAfter(fechaHasta)) {
            throw new SolicitudInvalidaException("La fecha inicial no puede ser posterior a la fecha final.");
        }
        var publicadoDesde = fechaDesde == null ? null : fechaDesde.atStartOfDay().toInstant(ZoneOffset.UTC);
        var publicadoHasta = fechaHasta == null ? null : fechaHasta.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        var pagina = repositorioPublicacion.buscarPublicadas(
                busquedaSegura,
                categoriaSegura,
                publicadoDesde,
                publicadoHasta,
                Instant.now(),
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.desc("publicadoEn"), Sort.Order.desc("idPublicacion"))));
        var imagenes = buscarImagenesPrincipales(pagina.getContent());
        return convertirPagina(
                pagina,
                pagina.getContent().stream()
                        .map(publicacion -> convertirPublicacion(
                                publicacion, imagenes.get(publicacion.obtenerIdPublicacion())))
                        .toList());
    }

    @Transactional(readOnly = true)
    public RespuestaDetallePublicacion consultarPublicacion(String identificadorUrl) {
        var identificadorSeguro = validarIdentificador(identificadorUrl);
        var publicacion = repositorioPublicacion
                .buscarPublicadaPorIdentificadorUrl(identificadorSeguro, Instant.now())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la publicación solicitada."));
        var categoria = publicacion.obtenerCategoria();
        var imagen = buscarImagenesPrincipales(List.of(publicacion)).get(publicacion.obtenerIdPublicacion());
        return new RespuestaDetallePublicacion(
                publicacion.obtenerIdentificadorUrl(),
                publicacion.obtenerTitulo(),
                publicacion.obtenerResumen(),
                publicacion.obtenerContenido(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                publicacion.obtenerFechaEditorial(),
                publicacion.obtenerPublicadoEn(),
                convertirImagen(imagen));
    }

    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaEventoPublico> listarEventos(int numeroPagina, int tamano) {
        var pagina = repositorioEvento.buscarAgendaPublica(
                ESTADOS_EVENTO_PUBLICOS,
                Instant.now(),
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.asc("iniciaEn"), Sort.Order.asc("idEvento"))));
        return convertirPagina(pagina, pagina.getContent().stream().map(this::convertirEvento).toList());
    }

    @Transactional(readOnly = true)
    public RespuestaDetalleEvento consultarEvento(String identificadorUrl) {
        var identificadorSeguro = validarIdentificador(identificadorUrl);
        var evento = repositorioEvento
                .buscarPublicoPorIdentificadorUrl(identificadorSeguro, ESTADOS_EVENTO_PUBLICOS)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el evento solicitado."));
        var requisitos = evento.obtenerRequisitos().stream()
                .map(requisito -> new RespuestaRequisitoEvento(
                        requisito.obtenerDescripcion(), requisito.esObligatorio()))
                .toList();
        return new RespuestaDetalleEvento(
                evento.obtenerIdEvento(),
                evento.obtenerIdentificadorUrl(),
                evento.obtenerTitulo(),
                evento.obtenerDescripcion(),
                evento.obtenerLugar(),
                evento.obtenerIniciaEn(),
                evento.obtenerFinalizaEn(),
                evento.obtenerInscripcionAbreEn(),
                evento.obtenerInscripcionCierraEn(),
                evento.obtenerCapacidadTotal(),
                calcularCuposDisponibles(evento),
                evento.obtenerEstado(),
                  requisitos,
                  evento.obtenerEsquemaFormularioJson(),
                  evento.obtenerConfiguracionGruposJson(),
                  obtenerUrlImagenEvento(evento),
                repositorioImagenEvento
                        .findAllByEvento_IdEventoOrderByOrdenVisualizacionAscIdImagenEventoAsc(
                                evento.obtenerIdEvento())
                        .stream()
                        .map(imagen -> convertirImagenEvento(evento, imagen))
                        .toList());
    }

    @Transactional(readOnly = true)
    public List<RespuestaAreaPublica> listarAreas() {
        return repositorioArea.buscarPublicas().stream().map(this::convertirArea).toList();
    }

    @Transactional(readOnly = true)
    public RespuestaResumenBicicletas consultarResumenBicicletas() {
        var cantidades = new LinkedHashMap<String, Long>();
        repositorioBicicleta.contarPorEstado().stream()
                .sorted((primero, segundo) -> primero.getEstado().compareTo(segundo.getEstado()))
                .forEach(conteo -> cantidades.put(conteo.getEstado(), conteo.getCantidad()));
        var total = cantidades.values().stream().mapToLong(Long::longValue).sum();
        return new RespuestaResumenBicicletas(
                total,
                cantidades.getOrDefault("DISPONIBLE", 0L),
                java.util.Map.copyOf(cantidades),
                repositorioBicicleta.buscarUltimaActualizacion());
    }

    private RespuestaPublicacionPublica convertirPublicacion(
            Publicacion publicacion,
            ImagenPublicacion imagenPrincipal) {
        var categoria = publicacion.obtenerCategoria();
        return new RespuestaPublicacionPublica(
                publicacion.obtenerIdentificadorUrl(),
                publicacion.obtenerTitulo(),
                publicacion.obtenerResumen(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                publicacion.obtenerFechaEditorial(),
                publicacion.obtenerPublicadoEn(),
                convertirImagen(imagenPrincipal));
    }

    private Map<Long, ImagenPublicacion> buscarImagenesPrincipales(List<Publicacion> publicaciones) {
        var identificadores = publicaciones.stream().map(Publicacion::obtenerIdPublicacion).toList();
        if (identificadores.isEmpty()) {
            return Map.of();
        }
        return repositorioImagenPublicacion
                .findAllByPublicacion_IdPublicacionInOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(identificadores)
                .stream()
                .collect(Collectors.toMap(
                        imagen -> imagen.obtenerPublicacion().obtenerIdPublicacion(),
                        Function.identity(),
                        (primera, ignorada) -> primera,
                        LinkedHashMap::new));
    }

    private RespuestaImagenPublica convertirImagen(ImagenPublicacion imagen) {
        if (imagen == null) {
            return null;
        }
        return new RespuestaImagenPublica(
                imagen.obtenerIdImagenPublicacion(),
                "/api/v1/publico/imagenes-publicaciones/" + imagen.obtenerIdImagenPublicacion(),
                imagen.obtenerTextoAlternativo(),
                imagen.obtenerAnchoPixeles(),
                imagen.obtenerAltoPixeles());
    }

    private RespuestaEventoPublico convertirEvento(Evento evento) {
        return new RespuestaEventoPublico(
                evento.obtenerIdEvento(),
                evento.obtenerIdentificadorUrl(),
                evento.obtenerTitulo(),
                evento.obtenerDescripcion(),
                evento.obtenerLugar(),
                evento.obtenerIniciaEn(),
                evento.obtenerFinalizaEn(),
                evento.obtenerInscripcionAbreEn(),
                evento.obtenerInscripcionCierraEn(),
                evento.obtenerCapacidadTotal(),
                calcularCuposDisponibles(evento),
                evento.obtenerEstado(),
                obtenerUrlImagenEvento(evento));
    }

    private String obtenerUrlImagenEvento(Evento evento) {
        return evento.obtenerClaveImagen() == null
                ? null
                : "/api/v1/publico/eventos/" + evento.obtenerIdentificadorUrl() + "/imagen";
    }

    private RespuestaImagenEventoPublica convertirImagenEvento(Evento evento, ImagenEvento imagen) {
        return new RespuestaImagenEventoPublica(
                imagen.obtenerIdImagenEvento(),
                "/api/v1/publico/eventos/imagenes-secundarias/" + imagen.obtenerIdImagenEvento(),
                evento.obtenerTitulo() + ", imagen secundaria " + imagen.obtenerOrdenVisualizacion(),
                imagen.obtenerAnchoPixeles(),
                imagen.obtenerAltoPixeles());
    }

    private RespuestaAreaPublica convertirArea(Area area) {
        var categoria = area.obtenerCategoria();
        var coordenadasConfirmadas = area.tieneCoordenadasConfirmadas();
        return new RespuestaAreaPublica(
                area.obtenerCodigo(),
                area.obtenerNumeroVisibleMapa(),
                area.obtenerNombre(),
                area.obtenerDescripcion(),
                area.obtenerEstado(),
                area.obtenerNotaDisponibilidad(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                area.obtenerHorarioJson(),
                coordenadasConfirmadas ? area.obtenerLatitud() : null,
                coordenadasConfirmadas ? area.obtenerLongitud() : null,
                area.obtenerActualizadoEn(),
                area.obtenerClaveImagen() == null
                        ? null
                        : "/api/v1/publico/areas/" + area.obtenerCodigo() + "/imagen");
    }

    private int calcularCuposDisponibles(Evento evento) {
        return Math.max(evento.obtenerCapacidadTotal() - evento.obtenerCantidadOcupada(), 0);
    }

    private String normalizarFiltro(String valor, int longitudMaxima, String mensaje) {
        if (valor == null) {
            return "";
        }
        if (valor.length() > longitudMaxima) {
            throw new SolicitudInvalidaException(mensaje);
        }
        return valor.strip();
    }

    private String validarIdentificador(String identificadorUrl) {
        if (identificadorUrl == null || identificadorUrl.isBlank() || identificadorUrl.length() > 190) {
            throw new RecursoNoEncontradoException("No se encontró el recurso solicitado.");
        }
        return identificadorUrl.strip();
    }

    private <T> RespuestaPaginaPublica<T> convertirPagina(Page<?> pagina, List<T> contenido) {
        return new RespuestaPaginaPublica<>(
                contenido,
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }
}
