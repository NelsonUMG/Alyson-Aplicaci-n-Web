package gt.gob.parqueerickbarrondo.identidad.aplicacion;


import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class InicializadorAdministrador implements ApplicationRunner {

    private static final Logger REGISTRO = LoggerFactory.getLogger(InicializadorAdministrador.class);

    private final boolean habilitado;
    private final String correo;
    private final String nombre;
    private final String apellido;
    private final String contrasena;
    private final RepositorioUsuario repositorioUsuario;
    private final RepositorioRol repositorioRol;
    private final PasswordEncoder codificadorContrasena;
    private final NormalizadorCorreo normalizadorCorreo;
    private final PoliticaContrasena politicaContrasena;
    private final ServicioAuditoria servicioAuditoria;

    public InicializadorAdministrador(
            @Value("${inicializacion.administrador.habilitado}") boolean habilitado,
            @Value("${inicializacion.administrador.correo}") String correo,
            @Value("${inicializacion.administrador.nombre}") String nombre,
            @Value("${inicializacion.administrador.apellido}") String apellido,
            @Value("${inicializacion.administrador.contrasena}") String contrasena,
            RepositorioUsuario repositorioUsuario,
            RepositorioRol repositorioRol,
            PasswordEncoder codificadorContrasena,
            NormalizadorCorreo normalizadorCorreo,
            PoliticaContrasena politicaContrasena,
            ServicioAuditoria servicioAuditoria) {
        this.habilitado = habilitado;
        this.correo = correo;
        this.nombre = nombre;
        this.apellido = apellido;
        this.contrasena = contrasena;
        this.repositorioUsuario = repositorioUsuario;
        this.repositorioRol = repositorioRol;
        this.codificadorContrasena = codificadorContrasena;
        this.normalizadorCorreo = normalizadorCorreo;
        this.politicaContrasena = politicaContrasena;
        this.servicioAuditoria = servicioAuditoria;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments argumentos) {
        if (!habilitado || repositorioUsuario.contarAdministradoresActivos() > 0) {
            return;
        }
        if (correo.isBlank() || nombre.isBlank() || apellido.isBlank()) {
            throw new IllegalStateException("La inicialización del administrador requiere correo, nombre y apellido.");
        }

        var correoNormalizado = normalizadorCorreo.normalizar(correo);
        var usuario = repositorioUsuario.findByCorreoNormalizado(correoNormalizado).orElseGet(() -> crearUsuario());
        var rolUsuario = repositorioRol.findByCodigo("USUARIOREGISTRADO")
                .orElseThrow(() -> new IllegalStateException("No existe el rol USUARIOREGISTRADO."));
        var rolAdministrador = repositorioRol.findByCodigo("ADMINISTRADOR")
                .orElseThrow(() -> new IllegalStateException("No existe el rol ADMINISTRADOR."));
        usuario.agregarRol(rolUsuario);
        usuario.agregarRol(rolAdministrador);
        usuario = repositorioUsuario.saveAndFlush(usuario);
        servicioAuditoria.registrar(
                usuario.obtenerIdUsuario(),
                "ADMINISTRADORINICIALCREADO",
                "USUARIO",
                usuario.obtenerIdUsuario().toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
        REGISTRO.info("Se creó el administrador inicial. Deshabilita y elimina sus variables de inicialización.");
    }

    private Usuario crearUsuario() {
        politicaContrasena.validar(contrasena);
        return new Usuario(
                normalizadorCorreo.normalizar(correo),
                nombre.strip(),
                apellido.strip(),
                codificadorContrasena.encode(contrasena),
                null);
    }
}
