package gt.gob.parqueerickbarrondo.solicitudes.dominio;

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
@Table(name = "Tramites", schema = "dbo")
public class Tramite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdTramite")
    private Long idTramite;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdCategoriaTramite", nullable = false)
    private CategoriaTramite categoria;

    @Column(name = "Codigo", nullable = false, length = 64)
    private String codigo;

    @Column(name = "Nombre", nullable = false, length = 180)
    private String nombre;

    @Column(name = "Resumen", nullable = false, length = 500)
    private String resumen;

    @Column(name = "Acerca", nullable = false)
    private String acerca;

    @Column(name = "RequisitosJson", nullable = false)
    private String requisitosJson;

    @Column(name = "DocumentosRequeridosJson", nullable = false)
    private String documentosRequeridosJson;

    @Column(name = "Costo", nullable = false, length = 180)
    private String costo;

    @Column(name = "TiempoRespuesta", nullable = false, length = 180)
    private String tiempoRespuesta;

    @Column(name = "RequiereReserva", nullable = false)
    private boolean requiereReserva;

    @Column(name = "Activo", nullable = false)
    private boolean activo;

    @Column(name = "ClavePortada", length = 500)
    private String clavePortada;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected Tramite() {
    }

    public Tramite(CategoriaTramite categoria, String codigo, String nombre, String resumen,
            String acerca, String requisitosJson, String documentosRequeridosJson,
            String costo, String tiempoRespuesta, boolean requiereReserva, boolean activo) {
        var ahora = Instant.now();
        this.categoria = categoria;
        this.codigo = codigo;
        this.nombre = nombre;
        this.resumen = resumen;
        this.acerca = acerca;
        this.requisitosJson = requisitosJson;
        this.documentosRequeridosJson = documentosRequeridosJson;
        this.costo = costo;
        this.tiempoRespuesta = tiempoRespuesta;
        this.requiereReserva = requiereReserva;
        this.activo = activo;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public Long obtenerIdTramite() { return idTramite; }
    public CategoriaTramite obtenerCategoria() { return categoria; }
    public String obtenerCodigo() { return codigo; }
    public String obtenerNombre() { return nombre; }
    public String obtenerResumen() { return resumen; }
    public String obtenerAcerca() { return acerca; }
    public String obtenerRequisitosJson() { return requisitosJson; }
    public String obtenerDocumentosRequeridosJson() { return documentosRequeridosJson; }
    public String obtenerCosto() { return costo; }
    public String obtenerTiempoRespuesta() { return tiempoRespuesta; }
    public boolean requiereReserva() { return requiereReserva; }
    public boolean estaActivo() { return activo; }
    public String obtenerClavePortada() { return clavePortada; }
    public Long obtenerVersion() { return version; }

    public void actualizar(CategoriaTramite categoria, String nombre, String resumen, String acerca,
            String requisitosJson, String documentosRequeridosJson, String costo,
            String tiempoRespuesta, boolean requiereReserva, boolean activo) {
        this.categoria = categoria;
        this.nombre = nombre;
        this.resumen = resumen;
        this.acerca = acerca;
        this.requisitosJson = requisitosJson;
        this.documentosRequeridosJson = documentosRequeridosJson;
        this.costo = costo;
        this.tiempoRespuesta = tiempoRespuesta;
        this.requiereReserva = requiereReserva;
        this.activo = activo;
        this.actualizadoEn = Instant.now();
    }

    public void establecerClavePortada(String clavePortada) {
        this.clavePortada = clavePortada;
        this.actualizadoEn = Instant.now();
    }
}
