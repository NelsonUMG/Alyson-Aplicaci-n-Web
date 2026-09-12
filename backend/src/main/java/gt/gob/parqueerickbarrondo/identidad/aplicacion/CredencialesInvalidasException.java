package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException() {
        this("La contraseña es incorrecta. Vuelve a intentarlo.");
    }

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
