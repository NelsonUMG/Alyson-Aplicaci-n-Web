package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.time.Duration;
import java.time.Instant;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.dominio.RegistroPendiente;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ServicioRegistroCuenta {
    private static final Logger LOG = LoggerFactory.getLogger(ServicioRegistroCuenta.class);
    private final RepositorioUsuario usuarios;
    private final RepositorioRol roles;
    private final RepositorioRegistroPendiente pendientes;
    private final PasswordEncoder codificador;
    private final NormalizadorCorreo normalizador;
    private final PoliticaContrasena politica;
    private final ServicioAuditoria auditoria;
    private final EnviadorCorreoVerificacion correo;
    private final Duration duracion;
    private final Duration espera;

    public ServicioRegistroCuenta(RepositorioUsuario usuarios, RepositorioRol roles,
            RepositorioRegistroPendiente pendientes, PasswordEncoder codificador,
            NormalizadorCorreo normalizador, PoliticaContrasena politica, ServicioAuditoria auditoria,
            EnviadorCorreoVerificacion correo,
            @Value("${correo.verificacion.duracion-horas:24}") long horas,
            @Value("${correo.verificacion.reenvio-espera-minutos:5}") long minutos) {
        this.usuarios = usuarios; this.roles = roles; this.pendientes = pendientes;
        this.codificador = codificador; this.normalizador = normalizador; this.politica = politica;
        this.auditoria = auditoria; this.correo = correo;
        if (horas <= 0 || minutos < 0) throw new IllegalArgumentException("Duración de verificación inválida.");
        duracion = Duration.ofHours(horas); espera = Duration.ofMinutes(minutos);
    }

    @Transactional
    public boolean registrar(SolicitudRegistroCuenta solicitud) {
        politica.validar(solicitud.contrasena());
        if (!solicitud.contrasena().equals(solicitud.confirmarContrasena()))
            throw new SolicitudInvalidaException("Las contraseñas no coinciden.");
        var direccion = normalizador.normalizar(solicitud.correo());
        var dpi = solicitud.dpi().strip();
        comprobarDisponibilidad(direccion, dpi);
        var pendiente = pendientes.findByCorreo(direccion).orElse(null);
        var ahora = Instant.now();
        if (pendiente != null && !puedeReenviar(pendiente, ahora))
            throw new SolicitudInvalidaException("Ya se solicitó un registro para este correo. Revisa tu bandeja o espera 5 minutos para intentarlo de nuevo.");
        // Cada nuevo registro reemplaza sus datos y su token juntos, nunca reutiliza una contraseña ajena.
        var hash = codificador.encode(solicitud.contrasena());
        if (pendiente == null) {
            pendiente = new RegistroPendiente(direccion, solicitud.nombre().strip(), solicitud.apellido().strip(),
                    dpi, solicitud.celular().strip(), solicitud.fechaNacimiento(), hash);
        } else {
            pendiente.actualizarDatos(solicitud.nombre().strip(), solicitud.apellido().strip(), dpi,
                    solicitud.celular().strip(), solicitud.fechaNacimiento(), hash);
        }
        return enviar(pendiente);
    }

    @Transactional
    public boolean confirmarPendiente(String token) {
        var pendiente = pendientes.findByHashToken(TokensSeguros.resumir(token.strip())).orElse(null);
        if (pendiente == null) return false;
        var ahora = Instant.now();
        if (pendiente.estaExpirado(ahora))
            throw new SolicitudInvalidaException("El enlace de verificación no es válido o ya venció.");
        comprobarDisponibilidad(pendiente.obtenerCorreo(), pendiente.obtenerDpi());
        var usuario = pendiente.crearUsuarioVerificado(ahora);
        usuario.agregarRol(roles.findByCodigo("USUARIOREGISTRADO")
                .orElseThrow(() -> new IllegalStateException("No existe el rol USUARIOREGISTRADO.")));
        usuario = usuarios.saveAndFlush(usuario);
        pendientes.delete(pendiente);
        auditoria.registrar(usuario.obtenerIdUsuario(), "CUENTAREGISTRADA", "USUARIO",
                usuario.obtenerIdUsuario().toString(), "EXITOSO", IdentificadorCorrelacion.actual());
        return true;
    }

    @Transactional
    public boolean reenviarPendiente(String direccion) {
        var pendiente = pendientes.findByCorreo(normalizador.normalizar(direccion)).orElse(null);
        if (pendiente == null) return false;
        if (puedeReenviar(pendiente, Instant.now())) enviar(pendiente);
        return true;
    }

    private boolean puedeReenviar(RegistroPendiente pendiente, Instant ahora) {
        return !pendiente.obtenerCreadoEn().isAfter(ahora.minus(espera));
    }

    private void comprobarDisponibilidad(String direccion, String dpi) {
        if (dpi != null && usuarios.existsByDpi(dpi))
            throw new ConflictoDatosException(
                    "El DPI o CUI ya está registrado. Por favor, inicia sesión con tu correo registrado.");
        if (usuarios.existsByCorreoNormalizado(direccion))
            throw new ConflictoDatosException(
                    "El correo electrónico ya está registrado. Por favor, inicia sesión con ese correo.");
    }

    private boolean enviar(RegistroPendiente pendiente) {
        var token = TokensSeguros.generar();
        var ahora = Instant.now();
        pendiente.renovarToken(TokensSeguros.resumir(token), ahora, ahora.plus(duracion));
        pendientes.saveAndFlush(pendiente);
        try {
            correo.enviar(pendiente.obtenerCorreo(), pendiente.obtenerNombre(), token);
            return true;
        } catch (RuntimeException error) {
            LOG.warn("No fue posible enviar la verificación del registro pendiente {}.", pendiente.obtenerId());
            return false;
        }
    }
}
