package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPerfil;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudActualizacionPerfil;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ServicioPerfilUsuario {

    private static final Logger REGISTRO = LoggerFactory.getLogger(ServicioPerfilUsuario.class);
    private static final String URL_FOTO = "/api/v1/autenticacion/perfil/foto";

    private final RepositorioUsuario repositorioUsuario;
    private final ServicioAlmacenamientoFotosPerfil almacenamientoFotos;
    private final ServicioAuditoria servicioAuditoria;
    private final TransactionTemplate transacciones;

    public ServicioPerfilUsuario(
            RepositorioUsuario repositorioUsuario,
            ServicioAlmacenamientoFotosPerfil almacenamientoFotos,
            ServicioAuditoria servicioAuditoria,
            TransactionTemplate transacciones) {
        this.repositorioUsuario = repositorioUsuario;
        this.almacenamientoFotos = almacenamientoFotos;
        this.servicioAuditoria = servicioAuditoria;
        this.transacciones = transacciones;
    }

    @Transactional(readOnly = true)
    public RespuestaPerfil obtener(UsuarioSesion sesion) {
        return convertir(sesion, buscar(sesion));
    }

    @Transactional
    public RespuestaPerfil actualizar(UsuarioSesion sesion, SolicitudActualizacionPerfil solicitud) {
        var usuario = buscar(sesion);
        usuario.actualizarPerfil(
                solicitud.nombre(),
                solicitud.apellido(),
                solicitud.celular(),
                solicitud.fechaNacimiento(),
                solicitud.dpiExtendidoEn(),
                solicitud.telefono(),
                solicitud.direccion());
        servicioAuditoria.registrar(
                sesion.obtenerIdUsuario(), "PERFILACTUALIZADO", "USUARIO",
                sesion.obtenerIdUsuario().toString(), "EXITOSO", null);
        return convertir(sesion, usuario);
    }

    public RespuestaPerfil guardarFoto(UsuarioSesion sesion, MultipartFile archivo) {
        var nuevaClave = almacenamientoFotos.guardar(archivo);
        CambioFoto cambio;
        try {
            cambio = transacciones.execute(estado -> {
                var usuario = buscar(sesion);
                var claveAnterior = usuario.obtenerClaveFotoPerfil();
                usuario.cambiarFotoPerfil(nuevaClave);
                repositorioUsuario.saveAndFlush(usuario);
                servicioAuditoria.registrar(
                        sesion.obtenerIdUsuario(), "FOTOPERFILACTUALIZADA", "USUARIO",
                        sesion.obtenerIdUsuario().toString(), "EXITOSO", null);
                return new CambioFoto(convertir(sesion, usuario), claveAnterior);
            });
        } catch (RuntimeException excepcion) {
            eliminarSinInterrumpir(nuevaClave);
            throw excepcion;
        }
        if (cambio == null) {
            eliminarSinInterrumpir(nuevaClave);
            throw new IllegalStateException("No fue posible actualizar la fotografía del perfil.");
        }
        eliminarSinInterrumpir(cambio.claveAnterior());
        return cambio.perfil();
    }

    public RespuestaPerfil eliminarFoto(UsuarioSesion sesion) {
        var cambio = transacciones.execute(estado -> {
            var usuario = buscar(sesion);
            var claveAnterior = usuario.obtenerClaveFotoPerfil();
            usuario.cambiarFotoPerfil(null);
            repositorioUsuario.saveAndFlush(usuario);
            servicioAuditoria.registrar(
                    sesion.obtenerIdUsuario(), "FOTOPERFILELIMINADA", "USUARIO",
                    sesion.obtenerIdUsuario().toString(), "EXITOSO", null);
            return new CambioFoto(convertir(sesion, usuario), claveAnterior);
        });
        if (cambio == null) throw new IllegalStateException("No fue posible eliminar la fotografía del perfil.");
        eliminarSinInterrumpir(cambio.claveAnterior());
        return cambio.perfil();
    }

    @Transactional(readOnly = true)
    public ArchivoFotoPerfil cargarFoto(UsuarioSesion sesion) {
        var clave = buscar(sesion).obtenerClaveFotoPerfil();
        if (clave == null) throw new RecursoNoEncontradoException("La cuenta no tiene una fotografía registrada.");
        return almacenamientoFotos.cargar(clave);
    }

    private Usuario buscar(UsuarioSesion sesion) {
        return repositorioUsuario.buscarConPermisosPorId(sesion.obtenerIdUsuario())
                .orElseThrow(CredencialesInvalidasException::new);
    }

    private RespuestaPerfil convertir(UsuarioSesion sesion, Usuario usuario) {
        return new RespuestaPerfil(
                usuario.obtenerIdUsuario(),
                usuario.obtenerCorreoNormalizado(),
                usuario.obtenerNombre(),
                usuario.obtenerApellido(),
                sesion.obtenerRoles(),
                sesion.obtenerPermisos(),
                usuario.obtenerDpi(),
                usuario.obtenerCelular(),
                usuario.obtenerFechaNacimiento(),
                usuario.obtenerDpiExtendidoEn(),
                usuario.obtenerTelefono(),
                usuario.obtenerDireccion(),
                usuario.obtenerClaveFotoPerfil() == null ? null : URL_FOTO);
    }

    private void eliminarSinInterrumpir(String clave) {
        if (clave == null) return;
        try {
            almacenamientoFotos.eliminar(clave);
        } catch (RuntimeException excepcion) {
            REGISTRO.warn("No fue posible retirar una fotografía de perfil sin referencia activa.", excepcion);
        }
    }

    private record CambioFoto(RespuestaPerfil perfil, String claveAnterior) {
    }
}
