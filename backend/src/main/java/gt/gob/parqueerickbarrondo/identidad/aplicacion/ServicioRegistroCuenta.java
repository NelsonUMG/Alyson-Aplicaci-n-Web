package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import java.time.Instant;

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

    public ServicioRegistroCuenta(
            RepositorioUsuario repositorioUsuario,
            RepositorioRol repositorioRol,
            PasswordEncoder codificadorContrasena,
            NormalizadorCorreo normalizadorCorreo,
            PoliticaContrasena politicaContrasena,
            ServicioAuditoria servicioAuditoria) {
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioRol = repositorioRol;
        this.codificadorContrasena = codificadorContrasena;
        this.normalizadorCorreo = normalizadorCorreo;
        this.politicaContrasena = politicaContrasena;
        this.servicioAuditoria = servicioAuditoria;
    }

    @Transactional
    public void registrar(SolicitudRegistroCuenta solicitud) {
        politicaContrasena.validar(solicitud.contrasena());
        var correo = normalizadorCorreo.normalizar(solicitud.correo());
        var hashContrasena = codificadorContrasena.encode(solicitud.contrasena());
        if (repositorioUsuario.existsByCorreoNormalizado(correo)) {
            return;
        }

        var rolUsuario = repositorioRol.findByCodigo("USUARIOREGISTRADO")
                .orElseThrow(() -> new IllegalStateException("No existe el rol base USUARIOREGISTRADO."));
        var usuario = new Usuario(
                correo,
                solicitud.nombre().strip(),
                solicitud.apellido().strip(),
                hashContrasena,
                Instant.now());
        usuario.agregarRol(rolUsuario);

        usuario = repositorioUsuario.saveAndFlush(usuario);

        servicioAuditoria.registrar(
                usuario.obtenerIdUsuario(),
                "CUENTAREGISTRADA",
                "USUARIO",
                usuario.obtenerIdUsuario().toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }
}
