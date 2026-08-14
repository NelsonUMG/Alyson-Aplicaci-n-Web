package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import gt.gob.parqueerickbarrondo.identidad.dominio.IntentoInicioSesion;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioIntentoInicioSesion;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class ProtectorIntentosInicioSesionPruebas {

    @Test
    void generaHuellasDeterministasSinGuardarElDatoVisible() {
        var repositorio = mock(RepositorioIntentoInicioSesion.class);
        var protector = new ProtectorIntentosInicioSesion(
                repositorio,
                "ClaveDePruebaConTreintaYDosCaracteresSeguros",
                5,
                15);

        var primeras = protector.crearHuellas("persona@ejemplo.com", "127.0.0.1", "Navegador");
        var segundas = protector.crearHuellas("persona@ejemplo.com", "127.0.0.1", "Navegador");

        assertThat(primeras.huellaCorreo()).hasSize(32).containsExactly(segundas.huellaCorreo());
        assertThat(new String(primeras.huellaCorreo())).doesNotContain("persona@ejemplo.com");
    }

    @Test
    void rechazaLaClavePublicaDelArchivoDeEjemplo() {
        var repositorio = mock(RepositorioIntentoInicioSesion.class);

        assertThatThrownBy(() -> new ProtectorIntentosInicioSesion(
                repositorio,
                "REEMPLAZARCONUNACLAVEALEATORIADE32BYTES",
                5,
                15))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("clave aleatoria propia");
    }

    @Test
    void guardaResultadoYMotivoConFormatoLegible() {
        var repositorio = mock(RepositorioIntentoInicioSesion.class);
        var protector = new ProtectorIntentosInicioSesion(
                repositorio,
                "ClaveDePruebaConTreintaYDosCaracteresSeguros",
                5,
                15);
        var huellas = protector.crearHuellas("persona@ejemplo.com", "127.0.0.1", "Navegador");

        protector.registrar(null, huellas, "FALLIDO", "CREDENCIALESINVALIDAS", "correlacion");

        var captor = ArgumentCaptor.forClass(IntentoInicioSesion.class);
        verify(repositorio).save(captor.capture());
        assertThat(ReflectionTestUtils.getField(captor.getValue(), "resultado")).isEqualTo("Fallido");
        assertThat(ReflectionTestUtils.getField(captor.getValue(), "motivoFallo"))
                .isEqualTo("Credenciales inválidas");
    }
}
