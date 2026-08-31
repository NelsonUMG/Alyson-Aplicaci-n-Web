package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import gt.gob.parqueerickbarrondo.areas.aplicacion.ServicioAlmacenamientoImagenesArea;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudCategoriaTramiteAdministrada;
import gt.gob.parqueerickbarrondo.solicitudes.api.modelo.SolicitudTramiteAdministrado;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.CategoriaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.dominio.Tramite;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioCategoriaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioResenaTramite;
import gt.gob.parqueerickbarrondo.solicitudes.infraestructura.persistencia.RepositorioTramite;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ServicioCatalogoTramitesPruebas {

    @Mock private RepositorioTramite tramites;
    @Mock private RepositorioCategoriaTramite categorias;
    @Mock private RepositorioResenaTramite resenas;
    @Mock private RepositorioUsuario usuarios;
    @Mock private ServicioAlmacenamientoImagenesArea imagenes;
    @Mock private ServicioAuditoria auditoria;
    @Mock private ObjectMapper json;
    @InjectMocks private ServicioCatalogoTramites servicio;

    @Test
    void creaUnaCategoriaPadreAunqueTodaviaNoTengaTramites() {
        var existente = new CategoriaTramite("RESERVAS", "Reservas", (short) 2, true);
        when(categorias.findAllByOrderByOrdenVisualizacionAscNombreAsc()).thenReturn(List.of(existente));
        when(categorias.existsByCodigo("ACTIVIDADESDEPORTIVAS")).thenReturn(false);
        when(categorias.saveAndFlush(any(CategoriaTramite.class))).thenAnswer(invocacion -> {
            var categoria = invocacion.getArgument(0, CategoriaTramite.class);
            ReflectionTestUtils.setField(categoria, "idCategoriaTramite", 8L);
            return categoria;
        });

        var respuesta = servicio.crearCategoria(4L,
                new SolicitudCategoriaTramiteAdministrada("Actividades deportivas"));

        assertThat(respuesta.idCategoria()).isEqualTo(8L);
        assertThat(respuesta.codigo()).isEqualTo("ACTIVIDADESDEPORTIVAS");
        assertThat(respuesta.ordenVisualizacion()).isEqualTo((short) 3);
        verify(auditoria).registrar(eq(4L), eq("CATEGORIATRAMITECREADA"), eq("CATEGORIATRAMITE"),
                eq("8"), eq("EXITOSO"), anyString());
    }

    @SuppressWarnings("unchecked")
    @Test
    void creaUnTramiteHijoVinculadoALaCategoriaPadreSeleccionada() throws Exception {
        var categoria = new CategoriaTramite("ACTIVIDADES", "Actividades", (short) 1, true);
        ReflectionTestUtils.setField(categoria, "idCategoriaTramite", 3L);
        when(categorias.findByIdCategoriaTramiteAndActivaTrue(3L)).thenReturn(Optional.of(categoria));
        when(tramites.existsByCodigo("CURSODENATACION")).thenReturn(false);
        when(json.writeValueAsString(any())).thenReturn("[]");
        when(json.readValue(anyString(), any(TypeReference.class))).thenReturn(List.of());
        when(tramites.saveAndFlush(any(Tramite.class))).thenAnswer(invocacion -> {
            var tramite = invocacion.getArgument(0, Tramite.class);
            ReflectionTestUtils.setField(tramite, "idTramite", 14L);
            ReflectionTestUtils.setField(tramite, "version", 0L);
            return tramite;
        });
        var solicitud = new SolicitudTramiteAdministrado(
                3L, "Curso de natación", "Inscripción al curso", "Información del curso",
                List.of("Tener 12 años"), List.of("DPI"), "Sin costo",
                "Revisión administrativa", false, true, null);

        var respuesta = servicio.crearTramite(4L, solicitud);

        assertThat(respuesta.idTramite()).isEqualTo(14L);
        assertThat(respuesta.idCategoria()).isEqualTo(3L);
        assertThat(respuesta.categoria()).isEqualTo("Actividades");
        verify(auditoria).registrar(eq(4L), eq("TRAMITECREADO"), eq("TRAMITE"),
                eq("14"), eq("EXITOSO"), anyString());
    }
}
