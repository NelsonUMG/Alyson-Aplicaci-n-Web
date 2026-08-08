package gt.gob.parqueerickbarrondo.areas.dominio;

import java.math.BigDecimal;
import java.time.Instant;

import gt.gob.parqueerickbarrondo.portalpublico.dominio.Area;
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
@Table(name = "NodosMapa", schema = "dbo")
public class NodoMapa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdNodoMapa")
    private Long idNodoMapa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "IdArea")
    private Area area;

    @Column(name = "TipoNodo", nullable = false, length = 32)
    private String tipoNodo;

    @Column(name = "Nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "Latitud", precision = 10, scale = 8)
    private BigDecimal latitud;

    @Column(name = "Longitud", precision = 11, scale = 8)
    private BigDecimal longitud;

    @Column(name = "CoordenadasConfirmadas", nullable = false)
    private boolean coordenadasConfirmadas;

    @Column(name = "Accesible", nullable = false)
    private boolean accesible;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected NodoMapa() {
    }

    public NodoMapa(
            Area area,
            String tipoNodo,
            String nombre,
            BigDecimal latitud,
            BigDecimal longitud,
            boolean coordenadasConfirmadas,
            boolean accesible) {
        var ahora = Instant.now();
        this.area = area;
        this.tipoNodo = tipoNodo;
        this.nombre = nombre;
        this.latitud = latitud;
        this.longitud = longitud;
        this.coordenadasConfirmadas = coordenadasConfirmadas;
        this.accesible = accesible;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdNodoMapa() {
        return idNodoMapa;
    }

    public Area obtenerArea() {
        return area;
    }

    public String obtenerTipoNodo() {
        return tipoNodo;
    }

    public String obtenerNombre() {
        return nombre;
    }

    public BigDecimal obtenerLatitud() {
        return latitud;
    }

    public BigDecimal obtenerLongitud() {
        return longitud;
    }

    public boolean tieneCoordenadasConfirmadas() {
        return coordenadasConfirmadas;
    }

    public boolean esAccesible() {
        return accesible;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizar(
            Area area,
            String tipoNodo,
            String nombre,
            BigDecimal latitud,
            BigDecimal longitud,
            boolean coordenadasConfirmadas,
            boolean accesible) {
        this.area = area;
        this.tipoNodo = tipoNodo;
        this.nombre = nombre;
        this.latitud = latitud;
        this.longitud = longitud;
        this.coordenadasConfirmadas = coordenadasConfirmadas;
        this.accesible = accesible;
        this.actualizadoEn = Instant.now();
    }
}
