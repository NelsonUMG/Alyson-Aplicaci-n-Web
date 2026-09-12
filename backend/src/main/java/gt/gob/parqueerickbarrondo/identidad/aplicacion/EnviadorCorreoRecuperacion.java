package gt.gob.parqueerickbarrondo.identidad.aplicacion;

public interface EnviadorCorreoRecuperacion {
    void enviar(String correo, String nombre, String token);
}
