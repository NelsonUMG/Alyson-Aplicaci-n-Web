package gt.gob.parqueerickbarrondo.eventos.api;

import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaPersonaInscritaReporte;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaResumenInscripcionesCurso;
import gt.gob.parqueerickbarrondo.eventos.aplicacion.ServicioReportesInscripciones;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/administracion/reportes/inscripciones")
@Validated
public class ControladorReportesInscripciones {

    private final ServicioReportesInscripciones servicioReportes;

    public ControladorReportesInscripciones(ServicioReportesInscripciones servicioReportes) {
        this.servicioReportes = servicioReportes;
    }

    @GetMapping
    public RespuestaPaginaPublica<RespuestaResumenInscripcionesCurso> listarCursos(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioReportes.listarCursos(busqueda, pagina, tamano);
    }

    @GetMapping("/{idEvento}/personas")
    public RespuestaPaginaPublica<RespuestaPersonaInscritaReporte> listarPersonas(
            @PathVariable Long idEvento,
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioReportes.listarPersonas(idEvento, busqueda, pagina, tamano);
    }
}
