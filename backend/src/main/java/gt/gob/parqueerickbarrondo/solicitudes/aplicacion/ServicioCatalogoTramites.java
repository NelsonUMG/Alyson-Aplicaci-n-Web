package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.function.Predicate;

import gt.gob.parqueerickbarrondo.areas.aplicacion.ArchivoImagenArea;
import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioAlmacenamientoImagenesArea;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaCategoriaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaCategoriaTramiteAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaDetalleTramite;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaResenaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaTramiteAdministrado;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.RespuestaTramiteResumen;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudResenaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudCategoriaTramiteAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudTramiteAdministrado;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.CategoriaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.ResenaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Tramite;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioCategoriaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioResenaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioTramite;
import org.springframework.stereotype.Service;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioCatalogoTramites {

    private final RepositorioTramite tramites;
    private final RepositorioCategoriaTramite categorias;
    private final RepositorioResenaTramite resenas;
    private final RepositorioUsuario usuarios;
    private final ServicioAlmacenamientoImagenesArea imagenes;
    private final ServicioAuditoria auditoria;
    private final ObjectMapper json;

    public ServicioCatalogoTramites(RepositorioTramite tramites,
            RepositorioCategoriaTramite categorias, RepositorioResenaTramite resenas,
            RepositorioUsuario usuarios, ServicioAlmacenamientoImagenesArea imagenes,
            ServicioAuditoria auditoria, ObjectMapper json) {
        this.tramites = tramites;
        this.categorias = categorias;
        this.resenas = resenas;
        this.usuarios = usuarios;
        this.imagenes = imagenes;
        this.auditoria = auditoria;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public List<RespuestaCategoriaTramite> listarCatalogo() {
        var agrupados = new LinkedHashMap<Long, List<RespuestaTramiteResumen>>();
        var nombres = new LinkedHashMap<Long, String>();
        var codigos = new LinkedHashMap<Long, String>();
        for (var tramite : tramites.findAllByActivoTrueAndCategoria_ActivaTrueOrderByCategoria_OrdenVisualizacionAscNombreAsc()) {
            var categoria = tramite.obtenerCategoria();
            agrupados.computeIfAbsent(categoria.obtenerIdCategoriaTramite(), ignorado -> new ArrayList<>())
                    .add(convertirResumen(tramite));
            nombres.put(categoria.obtenerIdCategoriaTramite(), categoria.obtenerNombre());
            codigos.put(categoria.obtenerIdCategoriaTramite(), categoria.obtenerCodigo());
        }
        return agrupados.entrySet().stream().map(entrada -> new RespuestaCategoriaTramite(
                entrada.getKey(), codigos.get(entrada.getKey()), nombres.get(entrada.getKey()), entrada.getValue())).toList();
    }

    @Transactional(readOnly = true)
    public RespuestaDetalleTramite consultar(String codigo, Long idUsuario) {
        var tramite = buscarActivo(codigo);
        var listaResenas = resenas.findTop20ByTramite_IdTramiteOrderByActualizadoEnDescIdResenaTramiteDesc(
                tramite.obtenerIdTramite());
        var promedio = listaResenas.stream().mapToInt(ResenaTramite::obtenerEstrellas).average().orElse(0);
        return new RespuestaDetalleTramite(
                tramite.obtenerIdTramite(), tramite.obtenerCodigo(), tramite.obtenerNombre(), tramite.obtenerResumen(),
                tramite.obtenerAcerca(), leerLista(tramite.obtenerRequisitosJson()),
                leerLista(tramite.obtenerDocumentosRequeridosJson()), tramite.obtenerCosto(),
                tramite.obtenerTiempoRespuesta(), tramite.requiereReserva(),
                tramite.obtenerCategoria().obtenerNombre(), urlPortada(tramite), promedio,
                resenas.countByTramite_IdTramite(tramite.obtenerIdTramite()),
                listaResenas.stream().map(resena -> convertirResena(resena, idUsuario)).toList());
    }

    @Transactional
    public RespuestaDetalleTramite guardarResena(
            String codigo, Long idUsuario, SolicitudResenaTramite solicitud) {
        var tramite = buscarActivo(codigo);
        var usuario = usuarios.findById(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario."));
        var resena = resenas.findByTramite_IdTramiteAndUsuario_IdUsuario(
                tramite.obtenerIdTramite(), idUsuario).orElse(null);
        if (resena == null) {
            resena = new ResenaTramite(tramite, usuario, solicitud.estrellas(), solicitud.comentario().strip());
        } else {
            resena.actualizar(solicitud.estrellas(), solicitud.comentario().strip());
        }
        resenas.saveAndFlush(resena);
        auditoria.registrar(idUsuario, "RESENATRAMITEGUARDADA", "TRAMITE", tramite.obtenerIdTramite().toString(),
                "EXITOSO", IdentificadorCorrelacion.actual());
        return consultar(codigo, idUsuario);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    public List<RespuestaTramiteAdministrado> listarAdministracion() {
        return tramites.findAllByOrderByCategoria_OrdenVisualizacionAscNombreAsc().stream()
                .map(this::convertirAdministrado).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    public List<RespuestaCategoriaTramiteAdministrada> listarCategoriasAdministracion() {
        return categorias.findAllByOrderByOrdenVisualizacionAscNombreAsc().stream()
                .map(this::convertirCategoriaAdministrada).toList();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    public RespuestaCategoriaTramiteAdministrada crearCategoria(
            Long idAdministrador, SolicitudCategoriaTramiteAdministrada solicitud) {
        var existentes = categorias.findAllByOrderByOrdenVisualizacionAscNombreAsc();
        var orden = existentes.stream().mapToInt(CategoriaTramite::obtenerOrdenVisualizacion).max().orElse(0) + 1;
        if (orden > Short.MAX_VALUE) {
            throw new ConflictoDatosException("No es posible agregar más categorías al catálogo.");
        }
        var nombre = solicitud.nombre().strip();
        var categoria = new CategoriaTramite(
                generarCodigoUnico(nombre, categorias::existsByCodigo), nombre, (short) orden, true);
        categorias.saveAndFlush(categoria);
        auditoria.registrar(idAdministrador, "CATEGORIATRAMITECREADA", "CATEGORIATRAMITE",
                categoria.obtenerIdCategoriaTramite().toString(), "EXITOSO", IdentificadorCorrelacion.actual());
        return convertirCategoriaAdministrada(categoria);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    public RespuestaTramiteAdministrado crearTramite(
            Long idAdministrador, SolicitudTramiteAdministrado solicitud) {
        var categoria = categorias.findByIdCategoriaTramiteAndActivaTrue(solicitud.idCategoria())
                .orElseThrow(() -> new SolicitudInvalidaException(
                        "Selecciona una categoría padre activa para el trámite hijo."));
        var nombre = solicitud.nombre().strip();
        var tramite = new Tramite(categoria, generarCodigoUnico(nombre, tramites::existsByCodigo), nombre,
                solicitud.resumen().strip(), solicitud.acerca().strip(), escribirLista(solicitud.requisitos()),
                escribirLista(solicitud.documentosRequeridos()), solicitud.costo().strip(),
                solicitud.tiempoRespuesta().strip(), solicitud.requiereReserva(), solicitud.activo());
        tramites.saveAndFlush(tramite);
        auditoria.registrar(idAdministrador, "TRAMITECREADO", "TRAMITE",
                tramite.obtenerIdTramite().toString(), "EXITOSO", IdentificadorCorrelacion.actual());
        return convertirAdministrado(tramite);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    public RespuestaTramiteAdministrado actualizar(
            Long idTramite, Long idAdministrador, SolicitudTramiteAdministrado solicitud) {
        var tramite = tramites.findByIdTramite(idTramite)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el trámite."));
        if (solicitud.version() == null || !solicitud.version().equals(tramite.obtenerVersion())) {
            throw new ConflictoDatosException("El trámite cambió. Recarga la página antes de guardar.");
        }
        var categoria = categorias.findById(solicitud.idCategoria())
                .orElseThrow(() -> new SolicitudInvalidaException("La categoría seleccionada no existe."));
        tramite.actualizar(categoria, solicitud.nombre().strip(), solicitud.resumen().strip(),
                solicitud.acerca().strip(), escribirLista(solicitud.requisitos()),
                escribirLista(solicitud.documentosRequeridos()), solicitud.costo().strip(),
                solicitud.tiempoRespuesta().strip(), solicitud.requiereReserva(), solicitud.activo());
        tramites.saveAndFlush(tramite);
        auditoria.registrar(idAdministrador, "TRAMITEACTUALIZADO", "TRAMITE", idTramite.toString(),
                "EXITOSO", IdentificadorCorrelacion.actual());
        return convertirAdministrado(tramite);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SOLICITUDGESTIONAR')")
    public RespuestaTramiteAdministrado actualizarPortada(
            Long idTramite, Long idAdministrador, MultipartFile archivo) {
        var tramite = tramites.findByIdTramite(idTramite)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el trámite."));
        var anterior = tramite.obtenerClavePortada();
        var guardada = imagenes.guardar(archivo);
        tramite.establecerClavePortada(guardada.claveAlmacenamiento());
        tramites.saveAndFlush(tramite);
        imagenes.eliminar(anterior);
        auditoria.registrar(idAdministrador, "PORTADATRAMITEACTUALIZADA", "TRAMITE", idTramite.toString(),
                "EXITOSO", IdentificadorCorrelacion.actual());
        return convertirAdministrado(tramite);
    }

    @Transactional(readOnly = true)
    public ArchivoImagenArea cargarPortada(String codigo) {
        var tramite = buscarActivo(codigo);
        if (tramite.obtenerClavePortada() == null) {
            throw new RecursoNoEncontradoException("Este trámite todavía no tiene imagen de portada.");
        }
        return imagenes.cargar(tramite.obtenerClavePortada());
    }

    private Tramite buscarActivo(String codigo) {
        return tramites.findByCodigoAndActivoTrueAndCategoria_ActivaTrue(codigo.strip().toUpperCase())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el trámite solicitado."));
    }

    private RespuestaTramiteResumen convertirResumen(Tramite tramite) {
        return new RespuestaTramiteResumen(tramite.obtenerIdTramite(), tramite.obtenerCodigo(),
                tramite.obtenerNombre(), tramite.obtenerResumen(), tramite.requiereReserva(), urlPortada(tramite));
    }

    private RespuestaResenaTramite convertirResena(ResenaTramite resena, Long idUsuario) {
        var usuario = resena.obtenerUsuario();
        return new RespuestaResenaTramite(resena.obtenerIdResenaTramite(),
                (usuario.obtenerNombre() + " " + usuario.obtenerApellido()).strip(), resena.obtenerEstrellas(),
                resena.obtenerComentario(), resena.obtenerActualizadoEn(),
                idUsuario != null && idUsuario.equals(usuario.obtenerIdUsuario()));
    }

    private RespuestaTramiteAdministrado convertirAdministrado(Tramite tramite) {
        return new RespuestaTramiteAdministrado(tramite.obtenerIdTramite(), tramite.obtenerCodigo(),
                tramite.obtenerCategoria().obtenerIdCategoriaTramite(), tramite.obtenerCategoria().obtenerNombre(),
                tramite.obtenerNombre(), tramite.obtenerResumen(), tramite.obtenerAcerca(),
                leerLista(tramite.obtenerRequisitosJson()), leerLista(tramite.obtenerDocumentosRequeridosJson()),
                tramite.obtenerCosto(), tramite.obtenerTiempoRespuesta(), tramite.requiereReserva(),
                tramite.estaActivo(), urlPortada(tramite), tramite.obtenerVersion());
    }

    private RespuestaCategoriaTramiteAdministrada convertirCategoriaAdministrada(CategoriaTramite categoria) {
        return new RespuestaCategoriaTramiteAdministrada(
                categoria.obtenerIdCategoriaTramite(), categoria.obtenerCodigo(), categoria.obtenerNombre(),
                categoria.obtenerOrdenVisualizacion(), categoria.estaActiva());
    }

    private String generarCodigoUnico(String nombre, Predicate<String> existe) {
        var base = Normalizer.normalize(nombre, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase()
                .replaceAll("[^A-Z0-9]+", "")
                .replaceAll("^0+", "");
        if (base.isBlank()) {
            base = "ELEMENTO";
        }
        base = base.substring(0, Math.min(base.length(), 56));
        var candidato = base;
        var consecutivo = 2;
        while (existe.test(candidato)) {
            var sufijo = String.valueOf(consecutivo++);
            candidato = base.substring(0, Math.min(base.length(), 64 - sufijo.length())) + sufijo;
        }
        return candidato;
    }

    private String urlPortada(Tramite tramite) {
        return tramite.obtenerClavePortada() == null ? null
                : "/api/v1/solicitudes/tramites/" + tramite.obtenerCodigo() + "/portada";
    }

    private List<String> leerLista(String valor) {
        try {
            return json.readValue(valor, new TypeReference<List<String>>() { });
        } catch (Exception excepcion) {
            throw new IllegalStateException("La configuración del trámite no es válida.", excepcion);
        }
    }

    private String escribirLista(List<String> valores) {
        try {
            return json.writeValueAsString(valores.stream().map(String::strip).filter(valor -> !valor.isBlank()).toList());
        } catch (Exception excepcion) {
            throw new IllegalStateException("No fue posible guardar la configuración del trámite.", excepcion);
        }
    }
}
