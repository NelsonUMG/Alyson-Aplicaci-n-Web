package gt.gob.parqueerickbarrondo.identidad.aplicacion;

import org.springframework.core.io.Resource;

public record ArchivoFotoPerfil(Resource recurso, String tipoMedio, long tamanoBytes) {
}
