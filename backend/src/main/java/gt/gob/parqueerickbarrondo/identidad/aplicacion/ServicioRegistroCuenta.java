package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.SolicitudRegistroCuenta;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioRegistroCuenta {

    private final RepositorioUsuario repositorioUsuario;
    private final RepositorioRol repositorioRol;
    private final PasswordEncoder codificadorContrasena;
    private final NormalizadorCorreo normalizadorCorreo;
    private final PoliticaContrasena politicaContrasena;
    private final ServicioAuditoria servicioAuditoria;
    private final ServicioVerificacionCorreo servicioVerificacionCorreo;

    public ServicioRegistroCuenta(
            RepositorioUsuario repositorioUsuario,
            RepositorioRol repositorioRol,
            PasswordEncoder codificadorContrasena,
            NormalizadorCorreo normalizadorCorreo,
            PoliticaContrasena politicaContrasena,
            ServicioAuditoria servicioAuditoria,
            ServicioVerificacionCorreo servicioVerificacionCorreo) {
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioRol = repositorioRol;
        this.codificadorContrasena = codificadorContrasena;
        this.normalizadorCorreo = normalizadorCorreo;
        this.politicaContrasena = politicaContrasena;
        this.servicioAuditoria = servicioAuditoria;
        this.servicioVerificacionCorreo = servicioVerificacionCorreo;
    }

    @Transactional
    public boolean registrar(SolicitudRegistroCuenta solicitud) {
        politicaContrasena.validar(solicitud.contrasena());
        if (!solicitud.contrasena().equals(solicitud.confirmarContrasena())) {
            throw new SolicitudInvalidaException("Las contraseñas no coinciden.");
        }
        var correo = normalizadorCorreo.normalizar(solicitud.correo());
        var dpi = solicitud.dpi().strip();
        if (repositorioUsuario.existsByCorreoNormalizado(correo)
                || repositorioUsuario.existsByDpi(dpi)) {
            throw new ConflictoDatosException("El correo electrónico o DPI/CUI ya está registrado.");
        }
        var hashContrasena = codificadorContrasena.encode(solicitud.contrasena());

        var rolUsuario = repositorioRol.findByCodigo("USUARIOREGISTRADO")
                .orElseThrow(() -> new IllegalStateException("No existe el rol base USUARIOREGISTRADO."));
        var usuario = new Usuario(
                correo,
                solicitud.nombre().strip(),
                solicitud.apellido().strip(),
                hashContrasena,
                null,
                dpi,
                solicitud.celular().strip(),
                solicitud.fechaNacimiento());
        usuario.requerirVerificacionCorreo();
        usuario.agregarRol(rolUsuario);

        usuario = repositorioUsuario.saveAndFlush(usuario);
        var correoEnviado = servicioVerificacionCorreo.crearYEnviar(usuario);

        servicioAuditoria.registrar(
                usuario.obtenerIdUsuario(),
                "CUENTAREGISTRADA",
                "USUARIO",
                usuario.obtenerIdUsuario().toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
        return correoEnviado;
    }
}
