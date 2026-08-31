package gt.gob.parqueerickbarrondo.solicitudes.dominio;

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
import jakarta.persistence.Version;

@Entity
@Table(name = "ResenasTramite", schema = "dbo")
public class ResenaTramite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdResenaTramite")
    private Long idResenaTramite;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdTramite", nullable = false)
    private Tramite tramite;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuario", nullable = false)
    private Usuario usuario;

    @Column(name = "Estrellas", nullable = false)
    private short estrellas;

    @Column(name = "Comentario", nullable = false, length = 1000)
    private String comentario;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected ResenaTramite() {
    }

    public ResenaTramite(Tramite tramite, Usuario usuario, short estrellas, String comentario) {
        var ahora = Instant.now();
        this.tramite = tramite;
        this.usuario = usuario;
        this.estrellas = estrellas;
        this.comentario = comentario;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public Long obtenerIdResenaTramite() { return idResenaTramite; }
    public Usuario obtenerUsuario() { return usuario; }
    public short obtenerEstrellas() { return estrellas; }
    public String obtenerComentario() { return comentario; }
    public Instant obtenerActualizadoEn() { return actualizadoEn; }

    public void actualizar(short estrellas, String comentario) {
        this.estrellas = estrellas;
        this.comentario = comentario;
        this.actualizadoEn = Instant.now();
    }
}
