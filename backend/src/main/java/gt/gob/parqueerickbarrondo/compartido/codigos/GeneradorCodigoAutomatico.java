package gt.gob.parqueerickbarrondo.compartido.codigos;

import java.util.HashSet;

public final class GeneradorCodigoAutomatico {

    private GeneradorCodigoAutomatico() {
    }

    public static String siguiente(Iterable<String> codigosExistentes) {
        var ocupados = new HashSet<Long>();
        for (var codigo : codigosExistentes) {
            try {
                var numero = Long.parseLong(codigo);
                if (numero > 0) {
                    ocupados.add(numero);
                }
            }
            catch (NumberFormatException ignorada) {
                // Los códigos históricos no numéricos no ocupan la secuencia automática.
            }
        }
        long candidato = 1;
        while (ocupados.contains(candidato)) {
            candidato++;
        }
        return Long.toString(candidato);
    }
}
