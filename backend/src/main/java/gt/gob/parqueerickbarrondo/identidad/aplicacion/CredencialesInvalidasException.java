package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException() {
        super("El correo o la contraseña no son válidos.");
    }
}
