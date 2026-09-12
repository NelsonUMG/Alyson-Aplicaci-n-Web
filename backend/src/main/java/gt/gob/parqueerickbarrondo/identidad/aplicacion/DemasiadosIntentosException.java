package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public class DemasiadosIntentosException extends RuntimeException {

    public DemasiadosIntentosException() {
        super("Alcanzaste el límite de 5 intentos. Espera 10 minutos antes de volver a intentarlo.");
    }
}
