package gt.gob.parqueerickbarrondo.areas.dominio;

import java.math.BigDecimal;
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
import jakarta.persistence.Version;

@Entity
@Table(name = "ConexionesMapa", schema = "dbo")
public class ConexionMapa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdConexionMapa")
    private Long idConexionMapa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdNodoOrigen", nullable = false)
    private NodoMapa nodoOrigen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdNodoDestino", nullable = false)
    private NodoMapa nodoDestino;

    @Column(name = "DistanciaMetros", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanciaMetros;

    @Column(name = "Bidireccional", nullable = false)
    private boolean bidireccional;

    @Column(name = "Accesible", nullable = false)
    private boolean accesible;

    @Column(name = "Cerrada", nullable = false)
    private boolean cerrada;

    @Column(name = "MotivoCierre", length = 300)
    private String motivoCierre;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected ConexionMapa() {
    }

    public ConexionMapa(
            NodoMapa nodoOrigen,
            NodoMapa nodoDestino,
            BigDecimal distanciaMetros,
            boolean bidireccional,
            boolean accesible,
            boolean cerrada,
            String motivoCierre) {
        var ahora = Instant.now();
        this.nodoOrigen = nodoOrigen;
        this.nodoDestino = nodoDestino;
        this.distanciaMetros = distanciaMetros;
        this.bidireccional = bidireccional;
        this.accesible = accesible;
        this.cerrada = cerrada;
        this.motivoCierre = motivoCierre;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdConexionMapa() {
        return idConexionMapa;
    }

    public NodoMapa obtenerNodoOrigen() {
        return nodoOrigen;
    }

    public NodoMapa obtenerNodoDestino() {
        return nodoDestino;
    }

    public BigDecimal obtenerDistanciaMetros() {
        return distanciaMetros;
    }

    public boolean esBidireccional() {
        return bidireccional;
    }

    public boolean esAccesible() {
        return accesible;
    }

    public boolean estaCerrada() {
        return cerrada;
    }

    public String obtenerMotivoCierre() {
        return motivoCierre;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizar(
            NodoMapa nodoOrigen,
            NodoMapa nodoDestino,
            BigDecimal distanciaMetros,
            boolean bidireccional,
            boolean accesible,
            boolean cerrada,
            String motivoCierre) {
        this.nodoOrigen = nodoOrigen;
        this.nodoDestino = nodoDestino;
        this.distanciaMetros = distanciaMetros;
        this.bidireccional = bidireccional;
        this.accesible = accesible;
        this.cerrada = cerrada;
        this.motivoCierre = motivoCierre;
        this.actualizadoEn = Instant.now();
    }
}
