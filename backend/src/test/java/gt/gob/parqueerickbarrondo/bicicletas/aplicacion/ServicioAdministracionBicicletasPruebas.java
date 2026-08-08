package gt.gob.parqueerickbarrondo.bicicletas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.RespuestaBicicletaAdministrada;
import gt.gob.parqueerickbarrondo.bicicletas.api.modelo.SolicitudCambioEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.dominio.HistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia.RepositorioHistorialEstadoBicicleta;
import gt.gob.parqueerickbarrondo.bicicletas.infraestructura.persistencia.RepositorioPrestamoBicicleta;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.RegistroIdempotencia;
import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Bicicleta;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioBicicleta;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ServicioAdministracionBicicletasPruebas {

    @Mock
    private RepositorioBicicleta repositorioBicicleta;
    @Mock
    private RepositorioHistorialEstadoBicicleta repositorioHistorial;
    @Mock
    private RepositorioPrestamoBicicleta repositorioPrestamo;
    @Mock
    private RepositorioUsuario repositorioUsuario;
    @Mock
    private ServicioIdempotencia servicioIdempotencia;
    @Mock
    private ServicioAuditoria servicioAuditoria;

    @InjectMocks
    private ServicioAdministracionBicicletas servicioAdministracion;

    @Test
    void cambiaElEstadoYRegistraUnHistorialInmutableConElResponsable() {
        var responsable = crearResponsable();
        var bicicleta = crearBicicleta(responsable, "DISPONIBLE");
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        var solicitud = new SolicitudCambioEstadoBicicleta(
                "ENMANTENIMIENTO", "Revisión preventiva", 3L);
        var contexto = ServicioIdempotencia.ContextoIdempotencia
                .<RespuestaBicicletaAdministrada>nuevo(
                        org.mockito.Mockito.mock(RegistroIdempotencia.class));
        when(servicioIdempotencia.preparar(
                "cambio-uno", 5L, "CAMBIARESTADOBICICLETA:9", solicitud,
                RespuestaBicicletaAdministrada.class)).thenReturn(contexto);
        when(repositorioBicicleta.buscarAdministradaPorId(9L)).thenReturn(Optional.of(bicicleta));
        when(repositorioPrestamo.existsByBicicleta_IdBicicletaAndEstado(9L, "ACTIVO"))
                .thenReturn(false);
        when(repositorioUsuario.findById(5L)).thenReturn(Optional.of(responsable));
        when(repositorioBicicleta.saveAndFlush(bicicleta)).thenReturn(bicicleta);

        var respuesta = servicioAdministracion.cambiarEstado(
                9L, solicitud, "cambio-uno", actor);

        var historial = ArgumentCaptor.forClass(HistorialEstadoBicicleta.class);
        verify(repositorioHistorial).save(historial.capture());
        assertThat(historial.getValue().obtenerEstadoAnterior()).isEqualTo("DISPONIBLE");
        assertThat(historial.getValue().obtenerEstadoNuevo()).isEqualTo("ENMANTENIMIENTO");
        assertThat(historial.getValue().obtenerMotivo()).isEqualTo("Revisión preventiva");
        assertThat(historial.getValue().obtenerCambiadoPor()).isSameAs(responsable);
        assertThat(respuesta.estado()).isEqualTo("ENMANTENIMIENTO");
        verify(servicioAuditoria).registrar(
                eq(5L), eq("ESTADOBICICLETAACTUALIZADO"), eq("BICICLETA"),
                eq("9"), eq("EXITOSO"), anyString());
        verify(servicioIdempotencia).completar(
                eq(contexto), eq(200), any(RespuestaBicicletaAdministrada.class));
    }

    @Test
    void impideLiberarUnaBicicletaMientrasConservaUnPrestamoActivo() {
        var responsable = crearResponsable();
        var bicicleta = crearBicicleta(responsable, "PRESTADA");
        var actor = org.mockito.Mockito.mock(UsuarioSesion.class);
        when(actor.obtenerIdUsuario()).thenReturn(5L);
        var solicitud = new SolicitudCambioEstadoBicicleta(
                "DISPONIBLE", "Liberación incorrecta", 3L);
        when(servicioIdempotencia.preparar(
                eq("cambio-dos"), eq(5L), eq("CAMBIARESTADOBICICLETA:9"),
                eq(solicitud), eq(RespuestaBicicletaAdministrada.class)))
                .thenReturn(ServicioIdempotencia.ContextoIdempotencia
                        .<RespuestaBicicletaAdministrada>nuevo(
                                org.mockito.Mockito.mock(RegistroIdempotencia.class)));
        when(repositorioBicicleta.buscarAdministradaPorId(9L)).thenReturn(Optional.of(bicicleta));
        when(repositorioPrestamo.existsByBicicleta_IdBicicletaAndEstado(9L, "ACTIVO"))
                .thenReturn(true);

        assertThatThrownBy(() -> servicioAdministracion.cambiarEstado(
                9L, solicitud, "cambio-dos", actor))
                .isInstanceOf(ConflictoDatosException.class)
                .hasMessageContaining("préstamo activo");

        verify(repositorioHistorial, never()).save(any());
        verify(repositorioBicicleta, never()).saveAndFlush(any());
    }

    private Usuario crearResponsable() {
        var responsable = new Usuario(
                "nelson@ejemplo.com", "Nelson", "Prueba", "hash", Instant.now());
        ReflectionTestUtils.setField(responsable, "idUsuario", 5L);
        return responsable;
    }

    private Bicicleta crearBicicleta(Usuario responsable, String estado) {
        var bicicleta = new Bicicleta("BIC001", estado, null, responsable);
        ReflectionTestUtils.setField(bicicleta, "idBicicleta", 9L);
        ReflectionTestUtils.setField(bicicleta, "version", 3L);
        return bicicleta;
    }
}
