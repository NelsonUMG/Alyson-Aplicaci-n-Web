package gt.gob.parqueerickbarrondo.eventos.dominio;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "Notificaciones", schema = "dbo")
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdNotificacion")
    private Long idNotificacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuarioDestinatario", nullable = false)
    private Usuario usuarioDestinatario;

    @Column(name = "TipoNotificacion", nullable = false, length = 64)
    private String tipoNotificacion;

    @Column(name = "Asunto", nullable = false, length = 180)
    private String asunto;

    @Column(name = "ContenidoJson")
    private String contenidoJson;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "LeidaEn")
    private Instant leidaEn;

    @Column(name = "EnviadaEn")
    private Instant enviadaEn;

    @Column(name = "CantidadIntentos", nullable = false)
    private short cantidadIntentos;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    protected Notificacion() {
    }

    public Notificacion(
            Usuario usuarioDestinatario,
            String tipoNotificacion,
            String asunto,
            String contenidoJson) {
        var ahora = Instant.now();
        this.usuarioDestinatario = usuarioDestinatario;
        this.tipoNotificacion = tipoNotificacion;
        this.asunto = asunto;
        this.contenidoJson = contenidoJson;
        this.estado = "PENDIENTE";
        this.cantidadIntentos = 0;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public void marcarEnviada() {
        var ahora = Instant.now();
        estado = "ENVIADA";
        enviadaEn = ahora;
        cantidadIntentos++;
        actualizadoEn = ahora;
    }

    public void marcarFallida() {
        estado = "FALLIDA";
        cantidadIntentos++;
        actualizadoEn = Instant.now();
    }
}
