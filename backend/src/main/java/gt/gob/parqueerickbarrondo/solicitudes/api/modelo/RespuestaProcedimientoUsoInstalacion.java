package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.util.List;

public record RespuestaProcedimientoUsoInstalacion(
        String codigo,
        String nombre,
        String descripcion,
        String finalidad,
        List<String> informacionRequerida,
        List<String> documentosObligatorios,
        List<String> documentosOpcionales,
        String costo,
        String advertenciaDisponibilidad) {
}
