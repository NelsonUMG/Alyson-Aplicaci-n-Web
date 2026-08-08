package gt.gob.parqueerickbarrondo.publicaciones.aplicacion;

import org.springframework.core.io.Resource;

public record ArchivoImagenPublica(Resource recurso, String tipoMedio, long tamanoBytes) {
}
