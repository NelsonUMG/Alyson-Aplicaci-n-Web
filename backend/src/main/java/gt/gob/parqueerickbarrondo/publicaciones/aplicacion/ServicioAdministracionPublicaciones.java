package gt.gob.parqueerickbarrondo.publicaciones.aplicacion;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import gt.gob.parqueerickbarrondo.compartido.codigos.GeneradorCodigoAutomatico;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.CategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.ImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Publicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioImagenPublicacion;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaCategoriaAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaImagenAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.RespuestaPublicacionAdministrada;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudCategoriaPublicacion;
import gt.gob.parqueerickbarrondo.publicaciones.api.modelo.SolicitudPublicacion;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioAdministracionPublicaciones {

    private static final Set<String> ESTADOS_VALIDOS = Set.of("BORRADOR", "PUBLICADA", "ARCHIVADA");
    private static final long MAXIMO_IMAGENES_PUBLICACION = 21L;

    private final RepositorioCategoriaPublicacion repositorioCategoria;
    private final RepositorioPublicacion repositorioPublicacion;
    private final RepositorioImagenPublicacion repositorioImagen;
    private final ServicioAlmacenamientoImagenesPublicacion servicioAlmacenamiento;
    private final ServicioAuditoria servicioAuditoria;
    private final ServicioIdempotencia servicioIdempotencia;

    public ServicioAdministracionPublicaciones(
            RepositorioCategoriaPublicacion repositorioCategoria,
            RepositorioPublicacion repositorioPublicacion,
            RepositorioImagenPublicacion repositorioImagen,
            ServicioAlmacenamientoImagenesPublicacion servicioAlmacenamiento,
            ServicioAuditoria servicioAuditoria,
            ServicioIdempotencia servicioIdempotencia) {
        this.repositorioCategoria = repositorioCategoria;
        this.repositorioPublicacion = repositorioPublicacion;
        this.repositorioImagen = repositorioImagen;
        this.servicioAlmacenamiento = servicioAlmacenamiento;
        this.servicioAuditoria = servicioAuditoria;
        this.servicioIdempotencia = servicioIdempotencia;
    }

    @PreAuthorize("hasAuthority('PUBLICACIONLEER')")
    @Transactional(readOnly = true)
    public List<RespuestaCategoriaAdministrada> listarCategorias() {
        return repositorioCategoria.findAllByOrderByOrdenVisualizacionAscNombreAsc().stream()
                .map(this::convertirCategoria)
                .toList();
    }

    @PreAuthorize("hasAuthority('PUBLICACIONCREAR')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public RespuestaCategoriaAdministrada crearCategoria(
            SolicitudCategoriaPublicacion solicitud,
            UsuarioSesion actor) {
        var orden = (short) solicitud.ordenVisualizacion();
        validarOrdenCategoriaDisponible(orden, null);
        var categoria = new CategoriaPublicacion(
                generarCodigoCategoria(),
                solicitud.nombre().strip(),
                normalizarOpcional(solicitud.descripcion()),
                orden,
                solicitud.activa());
        categoria = repositorioCategoria.saveAndFlush(categoria);
        auditar(actor, "CATEGORIAPUBLICACIONCREADA", "CATEGORIAPUBLICACION", categoria.obtenerIdCategoriaPublicacion());
        return convertirCategoria(categoria);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONACTUALIZAR')")
    @Transactional
    public RespuestaCategoriaAdministrada actualizarCategoria(
            Long idCategoria,
            SolicitudCategoriaPublicacion solicitud,
            UsuarioSesion actor) {
        var categoria = buscarCategoria(idCategoria);
        validarVersion(categoria.obtenerVersion(), solicitud.version(), "La categoría");
        var orden = (short) solicitud.ordenVisualizacion();
        validarOrdenCategoriaDisponible(orden, idCategoria);
        categoria.actualizar(
                categoria.obtenerCodigo(),
                solicitud.nombre().strip(),
                normalizarOpcional(solicitud.descripcion()),
                orden,
                solicitud.activa());
        repositorioCategoria.saveAndFlush(categoria);
        auditar(actor, "CATEGORIAPUBLICACIONACTUALIZADA", "CATEGORIAPUBLICACION", idCategoria);
        return convertirCategoria(categoria);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONELIMINAR')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void eliminarCategoria(Long idCategoria, Long version, UsuarioSesion actor) {
        var categoria = buscarCategoria(idCategoria);
        validarVersion(categoria.obtenerVersion(), version, "La categoría");
        if (repositorioPublicacion.existsByCategoria_IdCategoriaPublicacion(idCategoria)) {
            throw new ConflictoDatosException(
                    "No se puede eliminar la categoría porque tiene publicaciones asociadas.");
        }
        repositorioCategoria.delete(categoria);
        repositorioCategoria.flush();
        auditar(actor, "CATEGORIAPUBLICACIONELIMINADA", "CATEGORIAPUBLICACION", idCategoria);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONLEER')")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaPublicacionAdministrada> listarPublicaciones(
            String busqueda,
            String estado,
            Long idCategoria,
            String orden,
            int numeroPagina,
            int tamano) {
        var busquedaSegura = normalizarFiltro(busqueda, 100, "La búsqueda no puede superar 100 caracteres.");
        var estadoSeguro = normalizarEstado(estado);
        var pagina = repositorioPublicacion.buscarAdministradas(
                busquedaSegura,
                estadoSeguro,
                idCategoria,
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        obtenerOrden(orden)));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream().map(this::convertirPublicacion).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('PUBLICACIONLEER')")
    @Transactional(readOnly = true)
    public RespuestaPublicacionAdministrada consultarPublicacion(Long idPublicacion) {
        return convertirPublicacion(buscarPublicacion(idPublicacion));
    }

    @PreAuthorize("hasAuthority('PUBLICACIONLEER')")
    @Transactional(readOnly = true)
    public List<RespuestaImagenAdministrada> listarImagenes(Long idPublicacion) {
        buscarPublicacion(idPublicacion);
        return repositorioImagen
                .findAllByPublicacion_IdPublicacionOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(idPublicacion)
                .stream()
                .map(this::convertirImagen)
                .toList();
    }

    @PreAuthorize("hasAuthority('PUBLICACIONLEER')")
    @Transactional(readOnly = true)
    public ArchivoImagenPublica cargarImagen(Long idPublicacion, Long idImagen) {
        buscarPublicacion(idPublicacion);
        var imagen = repositorioImagen
                .findByIdImagenPublicacionAndPublicacion_IdPublicacion(idImagen, idPublicacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la imagen solicitada."));
        var recurso = servicioAlmacenamiento.cargar(imagen.obtenerClaveAlmacenamiento());
        return new ArchivoImagenPublica(recurso, imagen.obtenerTipoMedio(), imagen.obtenerTamanoBytes());
    }

    @PreAuthorize("hasAuthority('PUBLICACIONCREAR')")
    @Transactional
    public RespuestaPublicacionAdministrada crearPublicacion(
            SolicitudPublicacion solicitud,
            String claveIdempotencia,
            UsuarioSesion actor) {
        var contextoIdempotencia = servicioIdempotencia.preparar(
                claveIdempotencia,
                actor.obtenerIdUsuario(),
                "CREARPUBLICACION",
                solicitud,
                RespuestaPublicacionAdministrada.class);
        if (contextoIdempotencia.tieneRespuestaRepetida()) {
            return contextoIdempotencia.respuestaRepetida();
        }
        var categoria = buscarCategoriaActiva(solicitud.idCategoriaPublicacion());
        var publicacion = new Publicacion(
                categoria,
                actor.obtenerIdUsuario(),
                solicitud.titulo().strip(),
                generarIdentificadorUrl(solicitud.titulo()),
                solicitud.resumen().strip(),
                solicitud.contenido().strip(),
                solicitud.fechaEditorial());
        publicacion = repositorioPublicacion.saveAndFlush(publicacion);
        auditar(actor, "PUBLICACIONCREADA", "PUBLICACION", publicacion.obtenerIdPublicacion());
        var respuesta = convertirPublicacion(publicacion);
        servicioIdempotencia.completar(contextoIdempotencia, 201, respuesta);
        return respuesta;
    }

    @PreAuthorize("hasAuthority('PUBLICACIONACTUALIZAR')")
    @Transactional
    public RespuestaPublicacionAdministrada actualizarPublicacion(
            Long idPublicacion,
            SolicitudPublicacion solicitud,
            UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarVersion(publicacion.obtenerVersion(), solicitud.version(), "La publicación");
        validarNoArchivada(publicacion);
        var categoria = buscarCategoriaActiva(solicitud.idCategoriaPublicacion());
        publicacion.actualizar(
                categoria,
                solicitud.titulo().strip(),
                solicitud.resumen().strip(),
                solicitud.contenido().strip(),
                solicitud.fechaEditorial());
        repositorioPublicacion.saveAndFlush(publicacion);
        auditar(actor, "PUBLICACIONACTUALIZADA", "PUBLICACION", idPublicacion);
        return convertirPublicacion(publicacion);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONACTUALIZAR')")
    @Transactional
    public RespuestaPublicacionAdministrada publicar(Long idPublicacion, Long version, UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarVersion(publicacion.obtenerVersion(), version, "La publicación");
        validarNoArchivada(publicacion);
        if (!publicacion.obtenerCategoria().estaActiva()) {
            throw new SolicitudInvalidaException("No se puede publicar contenido en una categoría inactiva.");
        }
        if (repositorioImagen.countByPublicacion_IdPublicacion(idPublicacion) == 0) {
            throw new SolicitudInvalidaException(
                    "Agrega la imagen principal obligatoria antes de publicar la noticia.");
        }
        publicacion.publicar(Instant.now());
        repositorioPublicacion.saveAndFlush(publicacion);
        auditar(actor, "PUBLICACIONPUBLICADA", "PUBLICACION", idPublicacion);
        return convertirPublicacion(publicacion);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONELIMINAR')")
    @Transactional
    public RespuestaPublicacionAdministrada archivar(Long idPublicacion, Long version, UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarVersion(publicacion.obtenerVersion(), version, "La publicación");
        if ("ARCHIVADA".equals(publicacion.obtenerEstado())) {
            throw new SolicitudInvalidaException("La publicación ya está archivada.");
        }
        publicacion.archivar();
        repositorioPublicacion.saveAndFlush(publicacion);
        auditar(actor, "PUBLICACIONARCHIVADA", "PUBLICACION", idPublicacion);
        return convertirPublicacion(publicacion);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONELIMINAR')")
    @Transactional
    public void eliminarPublicacion(Long idPublicacion, Long version, UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarVersion(publicacion.obtenerVersion(), version, "La publicación");
        var imagenes = repositorioImagen
                .findAllByPublicacion_IdPublicacionOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(idPublicacion);
        var clavesAlmacenamiento = imagenes.stream()
                .map(ImagenPublicacion::obtenerClaveAlmacenamiento)
                .toList();
        repositorioImagen.deleteAllInBatch(imagenes);
        repositorioImagen.flush();
        repositorioPublicacion.delete(publicacion);
        repositorioPublicacion.flush();
        auditar(actor, "PUBLICACIONELIMINADA", "PUBLICACION", idPublicacion);
        eliminarArchivosDespuesDeConfirmar(clavesAlmacenamiento);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONACTUALIZAR')")
    @Transactional
    public RespuestaPublicacionAdministrada desarchivar(Long idPublicacion, Long version, UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarVersion(publicacion.obtenerVersion(), version, "La publicación");
        if (!"ARCHIVADA".equals(publicacion.obtenerEstado())) {
            throw new SolicitudInvalidaException("Solo una publicación archivada puede desarchivarse.");
        }
        publicacion.desarchivar();
        repositorioPublicacion.saveAndFlush(publicacion);
        auditar(actor, "PUBLICACIONDESARCHIVADA", "PUBLICACION", idPublicacion);
        return convertirPublicacion(publicacion);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONACTUALIZAR')")
    @Transactional
    public RespuestaImagenAdministrada agregarImagen(
            Long idPublicacion,
            MultipartFile archivo,
            UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarNoArchivada(publicacion);
        var cantidad = repositorioImagen.countByPublicacion_IdPublicacion(idPublicacion);
        if (cantidad >= MAXIMO_IMAGENES_PUBLICACION) {
            throw new SolicitudInvalidaException(
                    "Una publicación no puede tener más de 20 fotos de galería, además de la portada.");
        }
        var almacenada = servicioAlmacenamiento.guardar(archivo);
        eliminarArchivoSiTransaccionFalla(almacenada.claveAlmacenamiento());
        var imagen = new ImagenPublicacion(
                publicacion,
                almacenada.claveAlmacenamiento(),
                almacenada.nombreArchivoOriginal(),
                almacenada.tipoMedio(),
                almacenada.tamanoBytes(),
                almacenada.anchoPixeles(),
                almacenada.altoPixeles(),
                generarTextoAlternativo(publicacion, cantidad),
                (short) cantidad);
        repositorioImagen.saveAndFlush(imagen);
        auditar(actor, "IMAGENPUBLICACIONAGREGADA", "PUBLICACION", idPublicacion);
        return convertirImagen(imagen);
    }

    private String generarTextoAlternativo(Publicacion publicacion, long orden) {
        return orden == 0
                ? "Portada de " + publicacion.obtenerTitulo()
                : "Imagen " + orden + " de la galería de " + publicacion.obtenerTitulo();
    }

    @PreAuthorize("hasAuthority('PUBLICACIONELIMINAR')")
    @Transactional
    public void eliminarImagen(Long idPublicacion, Long idImagen, UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarNoArchivada(publicacion);
        var imagenes = repositorioImagen
                .findAllByPublicacion_IdPublicacionOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(idPublicacion);
        if (imagenes.size() <= 1) {
            throw new SolicitudInvalidaException(
                    "La portada es obligatoria. Carga otra imagen antes de eliminarla.");
        }
        var imagen = repositorioImagen
                .findByIdImagenPublicacionAndPublicacion_IdPublicacion(idImagen, idPublicacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la imagen solicitada."));
        var clave = imagen.obtenerClaveAlmacenamiento();
        repositorioImagen.delete(imagen);
        short orden = 0;
        for (var restante : imagenes) {
            if (!restante.obtenerIdImagenPublicacion().equals(idImagen)) {
                restante.cambiarOrdenVisualizacion(orden);
                restante.cambiarTextoAlternativo(generarTextoAlternativo(publicacion, orden));
                orden++;
            }
        }
        repositorioImagen.saveAll(imagenes.stream()
                .filter(restante -> !restante.obtenerIdImagenPublicacion().equals(idImagen))
                .toList());
        repositorioImagen.flush();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                servicioAlmacenamiento.eliminar(clave);
            }
        });
        auditar(actor, "IMAGENPUBLICACIONELIMINADA", "PUBLICACION", idPublicacion);
    }

    @PreAuthorize("hasAuthority('PUBLICACIONACTUALIZAR')")
    @Transactional
    public List<RespuestaImagenAdministrada> establecerPortada(
            Long idPublicacion,
            Long idImagen,
            UsuarioSesion actor) {
        var publicacion = buscarPublicacion(idPublicacion);
        validarNoArchivada(publicacion);
        var imagenes = repositorioImagen
                .findAllByPublicacion_IdPublicacionOrderByOrdenVisualizacionAscIdImagenPublicacionAsc(idPublicacion);
        var portada = imagenes.stream()
                .filter(imagen -> imagen.obtenerIdImagenPublicacion().equals(idImagen))
                .findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la imagen solicitada."));
        short orden = 1;
        portada.cambiarOrdenVisualizacion((short) 0);
        portada.cambiarTextoAlternativo(generarTextoAlternativo(publicacion, 0));
        for (var imagen : imagenes) {
            if (!imagen.obtenerIdImagenPublicacion().equals(idImagen)) {
                imagen.cambiarOrdenVisualizacion(orden);
                imagen.cambiarTextoAlternativo(generarTextoAlternativo(publicacion, orden));
                orden++;
            }
        }
        repositorioImagen.saveAllAndFlush(imagenes);
        auditar(actor, "PORTADAPUBLICACIONACTUALIZADA", "PUBLICACION", idPublicacion);
        return imagenes.stream()
                .sorted(java.util.Comparator.comparingInt(ImagenPublicacion::obtenerOrdenVisualizacion))
                .map(this::convertirImagen)
                .toList();
    }

    private CategoriaPublicacion buscarCategoria(Long idCategoria) {
        return repositorioCategoria.findByIdCategoriaPublicacion(idCategoria)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la categoría solicitada."));
    }

    private CategoriaPublicacion buscarCategoriaActiva(Long idCategoria) {
        var categoria = buscarCategoria(idCategoria);
        if (!categoria.estaActiva()) {
            throw new SolicitudInvalidaException("La categoría seleccionada está inactiva.");
        }
        return categoria;
    }

    private Publicacion buscarPublicacion(Long idPublicacion) {
        return repositorioPublicacion.buscarAdministradaPorId(idPublicacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la publicación solicitada."));
    }

    private void validarOrdenCategoriaDisponible(short orden, Long idCategoriaActual) {
        var existe = idCategoriaActual == null
                ? repositorioCategoria.existsByOrdenVisualizacion(orden)
                : repositorioCategoria.existsByOrdenVisualizacionAndIdCategoriaPublicacionNot(
                        orden, idCategoriaActual);
        if (existe) {
            throw new ConflictoDatosException("El orden " + orden + " ya está asignado a otra categoría.");
        }
    }

    private String generarCodigoCategoria() {
        return GeneradorCodigoAutomatico.siguiente(repositorioCategoria.findAllCodigos());
    }

    private String generarIdentificadorUrl(String titulo) {
        var sinAcentos = Normalizer.normalize(titulo, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        var base = sinAcentos.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (base.isBlank()) {
            base = "publicacion";
        }
        base = base.substring(0, Math.min(base.length(), 170));
        if (!repositorioPublicacion.existsByIdentificadorUrl(base)) {
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
            case "TITULO" -> Sort.by(Sort.Order.asc("titulo"), Sort.Order.desc("idPublicacion"));
            case "FECHAEDITORIAL" -> Sort.by(Sort.Order.desc("fechaEditorial"), Sort.Order.desc("idPublicacion"));
            case "ESTADO" -> Sort.by(Sort.Order.asc("estado"), Sort.Order.desc("idPublicacion"));
            case "", "ACTUALIZACION" -> Sort.by(Sort.Order.desc("actualizadoEn"), Sort.Order.desc("idPublicacion"));
            default -> throw new SolicitudInvalidaException("El orden solicitado no es válido.");
        };
    }

    private void validarVersion(Long versionActual, Long versionSolicitada, String recurso) {
        if (versionSolicitada == null || !versionActual.equals(versionSolicitada)) {
            throw new ConflictoDatosException(recurso + " cambió desde la última consulta. Recarga los datos.");
        }
    }

    private void validarNoArchivada(Publicacion publicacion) {
        if ("ARCHIVADA".equals(publicacion.obtenerEstado())) {
            throw new SolicitudInvalidaException("Una publicación archivada no puede modificarse ni publicarse.");
        }
    }

    private RespuestaCategoriaAdministrada convertirCategoria(CategoriaPublicacion categoria) {
        return new RespuestaCategoriaAdministrada(
                categoria.obtenerIdCategoriaPublicacion(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                categoria.obtenerDescripcion(),
                categoria.obtenerOrdenVisualizacion(),
                categoria.estaActiva(),
                categoria.obtenerVersion());
    }

    private RespuestaPublicacionAdministrada convertirPublicacion(Publicacion publicacion) {
        var categoria = publicacion.obtenerCategoria();
        return new RespuestaPublicacionAdministrada(
                publicacion.obtenerIdPublicacion(),
                categoria.obtenerIdCategoriaPublicacion(),
                categoria.obtenerCodigo(),
                categoria.obtenerNombre(),
                publicacion.obtenerTitulo(),
                publicacion.obtenerIdentificadorUrl(),
                publicacion.obtenerResumen(),
                publicacion.obtenerContenido(),
                publicacion.obtenerEstado(),
                publicacion.obtenerFechaEditorial(),
                publicacion.obtenerPublicadoEn(),
                publicacion.obtenerActualizadoEn(),
                publicacion.obtenerVersion());
    }

    private RespuestaImagenAdministrada convertirImagen(ImagenPublicacion imagen) {
        return new RespuestaImagenAdministrada(
                imagen.obtenerIdImagenPublicacion(),
                imagen.obtenerNombreArchivoOriginal(),
                imagen.obtenerTipoMedio(),
                imagen.obtenerTamanoBytes(),
                imagen.obtenerAnchoPixeles(),
                imagen.obtenerAltoPixeles(),
                imagen.obtenerTextoAlternativo(),
                imagen.obtenerOrdenVisualizacion());
    }

    private void eliminarArchivoSiTransaccionFalla(String claveAlmacenamiento) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int estado) {
                if (estado != TransactionSynchronization.STATUS_COMMITTED) {
                    servicioAlmacenamiento.eliminar(claveAlmacenamiento);
                }
            }
        });
    }

    private void eliminarArchivosDespuesDeConfirmar(List<String> clavesAlmacenamiento) {
        if (clavesAlmacenamiento.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                clavesAlmacenamiento.forEach(servicioAlmacenamiento::eliminar);
            }
        });
    }

    private void auditar(UsuarioSesion actor, String accion, String tipoRecurso, Long idRecurso) {
        servicioAuditoria.registrar(
                actor.obtenerIdUsuario(),
                accion,
                tipoRecurso,
                idRecurso.toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }
}
