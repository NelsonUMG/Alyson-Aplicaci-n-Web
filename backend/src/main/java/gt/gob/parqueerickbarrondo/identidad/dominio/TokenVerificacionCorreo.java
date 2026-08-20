package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.time.Instant;

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
@Table(name = "TokensVerificacionCorreo", schema = "dbo")
public class TokenVerificacionCorreo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdTokenVerificacionCorreo")
    private Long idTokenVerificacionCorreo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuario", nullable = false)
    private Usuario usuario;

    @Column(name = "HashToken", nullable = false, unique = true, columnDefinition = "varbinary(32)")
    private byte[] hashToken;

    @Column(name = "ExpiraEn", nullable = false)
    private Instant expiraEn;

    @Column(name = "ConsumidoEn")
    private Instant consumidoEn;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    protected TokenVerificacionCorreo() {
    }

    public TokenVerificacionCorreo(Usuario usuario, byte[] hashToken, Instant expiraEn, Instant creadoEn) {
        this.usuario = usuario;
        this.hashToken = hashToken.clone();
        this.expiraEn = expiraEn;
        this.creadoEn = creadoEn;
    }

    public Usuario obtenerUsuario() {
        return usuario;
    }

    public Instant obtenerExpiraEn() {
        return expiraEn;
    }

    public Instant obtenerConsumidoEn() {
        return consumidoEn;
    }

    public Instant obtenerCreadoEn() {
        return creadoEn;
    }

    public boolean estaExpirado(Instant fecha) {
        return !expiraEn.isAfter(fecha);
    }

    public void consumir(Instant fecha) {
        if (consumidoEn == null) {
            consumidoEn = fecha;
        }
    }
}
