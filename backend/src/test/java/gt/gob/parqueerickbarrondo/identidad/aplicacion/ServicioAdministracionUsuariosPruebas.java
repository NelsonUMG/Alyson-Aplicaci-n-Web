package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioRol;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.session.SessionRegistry;

class ServicioAdministracionUsuariosPruebas {

    @Test
    void rechazaUnaBusquedaExcesivamenteLarga() {
        var servicio = new ServicioAdministracionUsuarios(
                mock(RepositorioUsuario.class),
                mock(RepositorioRol.class),
                mock(SessionRegistry.class),
                mock(ServicioAuditoria.class));

        assertThatThrownBy(() -> servicio.listar("a".repeat(101), 0, 20))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("100 caracteres");
    }
}
