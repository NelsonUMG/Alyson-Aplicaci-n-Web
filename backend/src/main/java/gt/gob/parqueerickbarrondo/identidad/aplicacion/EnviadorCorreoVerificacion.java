package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public interface EnviadorCorreoVerificacion {

    void enviar(String correo, String nombre, String token);
}
