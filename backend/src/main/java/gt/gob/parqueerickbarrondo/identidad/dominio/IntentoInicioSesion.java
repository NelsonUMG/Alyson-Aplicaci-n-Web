package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "IntentosInicioSesion", schema = "dbo")
public class IntentoInicioSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdIntentoInicioSesion")
    private Long idIntentoInicioSesion;

    @Column(name = "IdUsuario")
    private Long idUsuario;

    @Column(name = "HuellaCorreo", nullable = false, columnDefinition = "VARBINARY(32)")
    private byte[] huellaCorreo;

    @Column(name = "HuellaIp", nullable = false, columnDefinition = "VARBINARY(32)")
    private byte[] huellaIp;

    @Column(name = "HuellaAgenteUsuario", columnDefinition = "VARBINARY(32)")
    private byte[] huellaAgenteUsuario;

    @Column(name = "Resultado", nullable = false, length = 32)
    private String resultado;

    @Column(name = "MotivoFallo", length = 64)
    private String motivoFallo;

    @Column(name = "IdCorrelacion", nullable = false, length = 64)
    private String idCorrelacion;

    @Column(name = "IntentadoEn", nullable = false)
    private Instant intentadoEn;

    protected IntentoInicioSesion() {
    }

    public IntentoInicioSesion(
            Long idUsuario,
            byte[] huellaCorreo,
            byte[] huellaIp,
            byte[] huellaAgenteUsuario,
            String resultado,
            String motivoFallo,
            String idCorrelacion) {
        this.idUsuario = idUsuario;
        this.huellaCorreo = huellaCorreo.clone();
        this.huellaIp = huellaIp.clone();
        this.huellaAgenteUsuario = huellaAgenteUsuario == null ? null : huellaAgenteUsuario.clone();
        this.resultado = resultado;
        this.motivoFallo = motivoFallo;
        this.idCorrelacion = idCorrelacion;
        this.intentadoEn = Instant.now();
    }
}
