package gt.gob.parqueerickbarrondo.areas.aplicacion;

import org.springframework.core.io.Resource;

public record ArchivoImagenArea(Resource recurso, String tipoMedio, long tamanoBytes) {
}
