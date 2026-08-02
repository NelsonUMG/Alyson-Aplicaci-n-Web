package gt.gob.parqueerickbarrondo.identidad.seguridad;

import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioDetallesUsuario implements UserDetailsService {

    private final RepositorioUsuario repositorioUsuario;

    public ServicioDetallesUsuario(RepositorioUsuario repositorioUsuario) {
        this.repositorioUsuario = repositorioUsuario;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String correoNormalizado) throws UsernameNotFoundException {
        return repositorioUsuario.findByCorreoNormalizado(correoNormalizado)
                .map(UsuarioSesion::new)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales no válidas."));
    }
}
