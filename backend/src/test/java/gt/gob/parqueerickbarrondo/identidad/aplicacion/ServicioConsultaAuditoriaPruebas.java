package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import gt.gob.parqueerickbarrondo.identidad.dominio.EventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioEventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ServicioConsultaAuditoriaPruebas {

    @Mock
    private RepositorioEventoAuditoria repositorioEventoAuditoria;
    @Mock
    private RepositorioUsuario repositorioUsuario;
    @InjectMocks
    private ServicioConsultaAuditoria servicioConsultaAuditoria;

    @Test
    void devuelveUnaPaginaFiltradaSinExponerDatosSensiblesDelActor() {
        var ocurridoEn = Instant.parse("2026-08-03T18:00:00Z");
        var evento = new EventoAuditoria(
                5L, "INICIOSESION", "SESION", null, "EXITOSO", "correlacion-segura");
        ReflectionTestUtils.setField(evento, "idEventoAuditoria", 9L);
        ReflectionTestUtils.setField(evento, "ocurridoEn", ocurridoEn);
        var actor = new Usuario(
                "nelson@ejemplo.com", "Nelson", "Prueba", "hash-secreto", Instant.now());
        ReflectionTestUtils.setField(actor, "idUsuario", 5L);
        when(repositorioEventoAuditoria.buscarPagina(
                anyString(), anyString(), anyString(), anyString(), isNull(), isNull(), isNull(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of(evento)));
        when(repositorioUsuario.findAllById(any())).thenReturn(List.of(actor));

        var respuesta = servicioConsultaAuditoria.listar(
                "inicioSesion", "sesion", "", "exitoso", null, null, null, 0, 20);

        assertThat(respuesta.totalElementos()).isEqualTo(1);
        assertThat(respuesta.contenido().getFirst().nombreActor()).isEqualTo("Nelson Prueba");
        assertThat(respuesta.contenido().getFirst().codigoAccion()).isEqualTo("INICIOSESION");
        assertThat(respuesta.contenido().getFirst().idCorrelacion()).isEqualTo("correlacion-segura");
    }

    @Test
    void rechazaUnRangoDeFechasInvertido() {
        assertThatThrownBy(() -> servicioConsultaAuditoria.listar(
                "", "", "", "", null,
                Instant.parse("2026-08-04T00:00:00Z"),
                Instant.parse("2026-08-03T00:00:00Z"),
                0,
                20))
                .isInstanceOf(SolicitudInvalidaException.class)
                .hasMessageContaining("fecha inicial");
    }
}
