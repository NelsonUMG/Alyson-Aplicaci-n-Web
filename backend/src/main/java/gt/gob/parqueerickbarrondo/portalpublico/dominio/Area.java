package gt.gob.parqueerickbarrondo.portalpublico.dominio;

import java.math.BigDecimal;
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
@Table(name = "Areas", schema = "dbo")
public class Area {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdArea")
    private Long idArea;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdCategoriaArea", nullable = false)
    private CategoriaArea categoria;

    @Column(name = "Codigo", nullable = false, length = 64)
    private String codigo;

    @Column(name = "NumeroVisibleMapa")
    private Integer numeroVisibleMapa;

    @Column(name = "Nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "Descripcion")
    private String descripcion;

    @Column(name = "Estado", nullable = false, length = 40)
    private String estado;

    @Column(name = "NotaDisponibilidad", length = 300)
    private String notaDisponibilidad;

    @Column(name = "Latitud", precision = 10, scale = 8)
    private BigDecimal latitud;

    @Column(name = "Longitud", precision = 11, scale = 8)
    private BigDecimal longitud;

    @Column(name = "CoordenadasConfirmadas", nullable = false)
    private boolean coordenadasConfirmadas;

    @Column(name = "HorarioJson")
    private String horarioJson;

    @Column(name = "ObservacionesInternas")
    private String observacionesInternas;

    @Column(name = "ClaveImagen", length = 500)
    private String claveImagen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CreadoPor", nullable = false)
    private Usuario creadoPor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ActualizadoPor", nullable = false)
    private Usuario actualizadoPor;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected Area() {
    }

    public Area(
            CategoriaArea categoria,
            String codigo,
            Integer numeroVisibleMapa,
            String nombre,
            String descripcion,
            String estado,
            String notaDisponibilidad,
            BigDecimal latitud,
            BigDecimal longitud,
            boolean coordenadasConfirmadas,
            String horarioJson,
            String observacionesInternas,
            Usuario responsable) {
        var ahora = Instant.now();
        this.categoria = categoria;
        this.codigo = codigo;
        this.numeroVisibleMapa = numeroVisibleMapa;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.estado = estado;
        this.notaDisponibilidad = notaDisponibilidad;
        this.latitud = latitud;
        this.longitud = longitud;
        this.coordenadasConfirmadas = coordenadasConfirmadas;
        this.horarioJson = horarioJson;
        this.observacionesInternas = observacionesInternas;
        this.creadoPor = responsable;
        this.actualizadoPor = responsable;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdArea() {
        return idArea;
    }

    public CategoriaArea obtenerCategoria() {
        return categoria;
    }

    public String obtenerCodigo() {
        return codigo;
    }

    public Integer obtenerNumeroVisibleMapa() {
        return numeroVisibleMapa;
    }

    public String obtenerNombre() {
        return nombre;
    }

    public String obtenerDescripcion() {
        return descripcion;
    }

    public String obtenerEstado() {
        return estado;
    }

    public String obtenerNotaDisponibilidad() {
        return notaDisponibilidad;
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

    public String obtenerHorarioJson() {
        return horarioJson;
    }

    public String obtenerObservacionesInternas() {
        return observacionesInternas;
    }

    public String obtenerClaveImagen() {
        return claveImagen;
    }

    public Usuario obtenerActualizadoPor() {
        return actualizadoPor;
    }

    public Instant obtenerCreadoEn() {
        return creadoEn;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizarDatos(
            CategoriaArea categoria,
            String codigo,
            Integer numeroVisibleMapa,
            String nombre,
            String descripcion,
            String notaDisponibilidad,
            BigDecimal latitud,
            BigDecimal longitud,
            boolean coordenadasConfirmadas,
            String horarioJson,
            String observacionesInternas,
            Usuario responsable) {
        this.categoria = categoria;
        this.codigo = codigo;
        this.numeroVisibleMapa = numeroVisibleMapa;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.notaDisponibilidad = notaDisponibilidad;
        this.latitud = latitud;
        this.longitud = longitud;
        this.coordenadasConfirmadas = coordenadasConfirmadas;
        this.horarioJson = horarioJson;
        this.observacionesInternas = observacionesInternas;
        this.actualizadoPor = responsable;
        this.actualizadoEn = Instant.now();
    }

    public void cambiarEstado(String nuevoEstado, Usuario responsable) {
        estado = nuevoEstado;
        actualizadoPor = responsable;
        actualizadoEn = Instant.now();
    }

    public void establecerClaveImagen(String nuevaClave, Usuario responsable) {
        claveImagen = nuevaClave;
        actualizadoPor = responsable;
        actualizadoEn = Instant.now();
    }
}
