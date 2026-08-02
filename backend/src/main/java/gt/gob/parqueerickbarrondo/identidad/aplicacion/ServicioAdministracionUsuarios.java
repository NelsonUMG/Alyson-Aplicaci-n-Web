package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPagina;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaRol;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaUsuarioAdministrado;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudActualizacionRoles;
import gt.gob.parqueerickbarrondo.identidad.dominio.Rol;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class ServicioAdministracionUsuarios {

    private final RepositorioUsuario repositorioUsuario;
    private final RepositorioRol repositorioRol;
    private final SessionRegistry registroSesiones;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioAdministracionUsuarios(
            RepositorioUsuario repositorioUsuario,
            RepositorioRol repositorioRol,
            SessionRegistry registroSesiones,
            ServicioAuditoria servicioAuditoria) {
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioRol = repositorioRol;
        this.registroSesiones = registroSesiones;
        this.servicioAuditoria = servicioAuditoria;
    }

    @PreAuthorize("hasAuthority('USUARIOGESTIONAR')")
    @Transactional(readOnly = true)
    public RespuestaPagina<RespuestaUsuarioAdministrado> listar(String busqueda, int numeroPagina, int tamano) {
        if (busqueda != null && busqueda.length() > 100) {
            throw new SolicitudInvalidaException("La búsqueda no puede superar 100 caracteres.");
        }
        var paginaSegura = Math.max(numeroPagina, 0);
        var tamanoSeguro = Math.clamp(tamano, 1, 50);
        var pagina = repositorioUsuario.buscarPagina(
                busqueda == null ? "" : busqueda.strip(),
                PageRequest.of(paginaSegura, tamanoSeguro, Sort.by("idUsuario").ascending()));
        var identificadores = pagina.getContent().stream().map(Usuario::obtenerIdUsuario).toList();
        var usuariosConRoles = identificadores.isEmpty()
                ? Map.<Long, Usuario>of()
                : repositorioUsuario.buscarConRolesPorIds(identificadores).stream()
                        .collect(Collectors.toMap(Usuario::obtenerIdUsuario, Function.identity()));
        var contenido = identificadores.stream()
                .map(usuariosConRoles::get)
                .map(this::convertirUsuario)
                .toList();
        return new RespuestaPagina<>(
                contenido,
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    @PreAuthorize("hasAuthority('ROLGESTIONAR')")
    @Transactional(readOnly = true)
    public List<RespuestaRol> listarRoles() {
        return repositorioRol.findAllByActivoTrueOrderByNombreAsc().stream()
                .map(this::convertirRol)
                .toList();
    }

    @PreAuthorize("hasAuthority('ROLGESTIONAR')")
    @Transactional
    public RespuestaUsuarioAdministrado actualizarRoles(
            Long idUsuario,
            SolicitudActualizacionRoles solicitud,
            UsuarioSesion actor) {
        repositorioRol.bloquearPorCodigo("ADMINISTRADOR")
                .orElseThrow(() -> new IllegalStateException("No existe el rol ADMINISTRADOR."));
        var usuario = repositorioUsuario.buscarConPermisosPorId(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario solicitado."));
        if (!usuario.obtenerVersion().equals(solicitud.versionUsuario())) {
            throw new ConflictoDatosException("El usuario cambió desde la última consulta. Recarga los datos.");
        }

        var codigosSolicitados = normalizarCodigos(solicitud.codigosRoles());
        if (!codigosSolicitados.contains("USUARIOREGISTRADO")) {
            throw new SolicitudInvalidaException("Toda cuenta activa debe conservar el rol USUARIOREGISTRADO.");
        }
        var rolesSolicitados = repositorioRol.findAllByCodigoInAndActivoTrue(codigosSolicitados);
        if (rolesSolicitados.size() != codigosSolicitados.size()) {
            throw new SolicitudInvalidaException("Uno o más roles no existen o están deshabilitados.");
        }

        validarEscalacion(usuario.obtenerRoles(), rolesSolicitados, actor);
        validarUltimoAdministrador(usuario, codigosSolicitados);
        usuario.reemplazarRoles(new LinkedHashSet<>(rolesSolicitados));
        repositorioUsuario.flush();
        invalidarSesionesDespuesDeConfirmar(new UsuarioSesion(usuario));
        servicioAuditoria.registrar(
                actor.obtenerIdUsuario(),
                "ROLESUSUARIOACTUALIZADOS",
                "USUARIO",
                idUsuario.toString(),
                "EXITOSO",
                UUID.randomUUID().toString());
        return convertirUsuario(usuario);
    }

    private void validarEscalacion(Collection<Rol> rolesActuales, Collection<Rol> rolesNuevos, UsuarioSesion actor) {
        var codigosActuales = rolesActuales.stream().map(Rol::obtenerCodigo).collect(Collectors.toSet());
        for (Rol rol : rolesNuevos) {
            if (codigosActuales.contains(rol.obtenerCodigo())) {
                continue;
            }
            if ("ADMINISTRADOR".equals(rol.obtenerCodigo()) && !actor.obtenerRoles().contains("ADMINISTRADOR")) {
                throw new SolicitudInvalidaException("No puedes asignar un rol superior al propio.");
            }
            var permisosRol = rol.obtenerPermisos().stream().map(permiso -> permiso.obtenerCodigo()).toList();
            if (!actor.obtenerPermisos().containsAll(permisosRol)) {
                throw new SolicitudInvalidaException("No puedes asignar permisos que no posees.");
            }
        }
    }

    private void validarUltimoAdministrador(Usuario usuario, Set<String> codigosSolicitados) {
        var eraAdministrador = usuario.obtenerRoles().stream()
                .anyMatch(rol -> "ADMINISTRADOR".equals(rol.obtenerCodigo()));
        if (eraAdministrador
                && !codigosSolicitados.contains("ADMINISTRADOR")
                && repositorioUsuario.contarAdministradoresActivos() <= 1) {
            throw new ConflictoDatosException("No se puede retirar el último administrador activo.");
        }
    }

    private Set<String> normalizarCodigos(Set<String> codigos) {
        if (codigos == null) {
            return Set.of();
        }
        return codigos.stream()
                .filter(codigo -> codigo != null && !codigo.isBlank())
                .map(codigo -> codigo.strip().toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void invalidarSesionesDespuesDeConfirmar(UsuarioSesion principal) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                registroSesiones.getAllSessions(principal, false)
                        .forEach(informacion -> informacion.expireNow());
            }
        });
    }

    private RespuestaUsuarioAdministrado convertirUsuario(Usuario usuario) {
        var roles = usuario.obtenerRoles().stream()
                .map(Rol::obtenerCodigo)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return new RespuestaUsuarioAdministrado(
                usuario.obtenerIdUsuario(),
                usuario.obtenerCorreoNormalizado(),
                usuario.obtenerNombre(),
                usuario.obtenerApellido(),
                usuario.obtenerEstado(),
                usuario.obtenerUltimoAccesoEn(),
                usuario.obtenerVersion(),
                Set.copyOf(roles));
    }

    private RespuestaRol convertirRol(Rol rol) {
        var permisos = rol.obtenerPermisos().stream()
                .map(permiso -> permiso.obtenerCodigo())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return new RespuestaRol(
                rol.obtenerIdRol(),
                rol.obtenerCodigo(),
                rol.obtenerNombre(),
                rol.obtenerDescripcion(),
                Set.copyOf(permisos));
    }
}
