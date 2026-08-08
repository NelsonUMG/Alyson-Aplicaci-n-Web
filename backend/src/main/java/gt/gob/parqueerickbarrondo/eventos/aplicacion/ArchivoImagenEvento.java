package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import org.springframework.core.io.Resource;

public record ArchivoImagenEvento(Resource recurso, String tipoMedio, long tamanoBytes) {
}
