package gt.gob.parqueerickbarrondo.solicitudes.aplicacion;

public interface EnviadorCorreoResolucionSolicitud {
    void enviar(String correo, String nombre, Long idSolicitud, String estado, String motivo);
}
