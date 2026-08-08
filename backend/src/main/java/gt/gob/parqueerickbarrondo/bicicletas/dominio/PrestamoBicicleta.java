package gt.gob.parqueerickbarrondo.bicicletas.dominio;

import java.time.Instant;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Bicicleta;
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
@Table(name = "PrestamosBicicleta", schema = "dbo")
public class PrestamoBicicleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdPrestamoBicicleta")
    private Long idPrestamoBicicleta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdBicicleta", nullable = false)
    private Bicicleta bicicleta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdUsuario", nullable = false)
    private Usuario usuario;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "PrestadoEn", nullable = false)
    private Instant prestadoEn;

    @Column(name = "VenceEn", nullable = false)
    private Instant venceEn;

    @Column(name = "DevueltoEn")
    private Instant devueltoEn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "PrestadoPor", nullable = false)
    private Usuario prestadoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RecibidoPor")
    private Usuario recibidoPor;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected PrestamoBicicleta() {
    }
}
