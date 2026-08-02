package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public class DemasiadosIntentosException extends RuntimeException {

    public DemasiadosIntentosException() {
        super("Hay demasiados intentos. Espera unos minutos antes de volver a intentarlo.");
    }
}
