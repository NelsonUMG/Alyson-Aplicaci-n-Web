package gt.gob.parqueerickbarrondo.identidad.api;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaEventoAuditoria;
import gt.gob.parqueerickbarrondo.identidad.api.modelo.RespuestaPagina;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioConsultaAuditoria;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/administracion/auditoria")
public class ControladorAuditoria {

    private final ServicioConsultaAuditoria servicioConsultaAuditoria;

    public ControladorAuditoria(ServicioConsultaAuditoria servicioConsultaAuditoria) {
        this.servicioConsultaAuditoria = servicioConsultaAuditoria;
    }

    @GetMapping
    public RespuestaPagina<RespuestaEventoAuditoria> listar(
            @RequestParam(defaultValue = "") String accion,
            @RequestParam(defaultValue = "") String tipoRecurso,
            @RequestParam(defaultValue = "") String idRecurso,
            @RequestParam(defaultValue = "") String resultado,
            @RequestParam(required = false) Long idUsuarioActor,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioConsultaAuditoria.listar(
                accion,
                tipoRecurso,
                idRecurso,
                resultado,
                idUsuarioActor,
                desde,
                hasta,
                pagina,
                tamano);
    }
}
