package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public interface EnviadorCorreoVerificacion {

    default boolean habilitado() { return true; }

    void enviar(String correo, String nombre, String token);
}
