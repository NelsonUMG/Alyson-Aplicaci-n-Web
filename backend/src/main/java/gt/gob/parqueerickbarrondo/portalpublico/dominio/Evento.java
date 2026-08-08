package gt.gob.parqueerickbarrondo.portalpublico.dominio;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import gt.gob.parqueerickbarrondo.identidad.dominio.Usuario;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "Eventos", schema = "dbo")
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdEvento")
    private Long idEvento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CreadoPor", nullable = false)
    private Usuario creadoPor;

    @Column(name = "Titulo", nullable = false, length = 180)
    private String titulo;

    @Column(name = "IdentificadorUrl", nullable = false, length = 190)
    private String identificadorUrl;

    @Column(name = "Descripcion", nullable = false)
    private String descripcion;

    @Column(name = "Lugar", length = 180)
    private String lugar;

    @Column(name = "IniciaEn", nullable = false)
    private Instant iniciaEn;

    @Column(name = "FinalizaEn")
    private Instant finalizaEn;

    @Column(name = "InscripcionAbreEn")
    private Instant inscripcionAbreEn;

    @Column(name = "InscripcionCierraEn")
    private Instant inscripcionCierraEn;

    @Column(name = "CapacidadTotal", nullable = false)
    private int capacidadTotal;

    @Column(name = "CantidadOcupada", nullable = false)
    private int cantidadOcupada;

    @Column(name = "Estado", nullable = false, length = 24)
    private String estado;

    @Column(name = "ClaveImagen", length = 500)
    private String claveImagen;

    @Column(name = "EsquemaFormularioJson")
    private String esquemaFormularioJson;

    @Column(name = "CreadoEn", nullable = false)
    private Instant creadoEn;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    @OneToMany(mappedBy = "evento", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordenVisualizacion ASC, idRequisitoEvento ASC")
    private List<RequisitoEvento> requisitos = new ArrayList<>();

    protected Evento() {
    }

    public Evento(
            Usuario creadoPor,
            String titulo,
            String identificadorUrl,
            String descripcion,
            String lugar,
            Instant iniciaEn,
            Instant finalizaEn,
            Instant inscripcionAbreEn,
            Instant inscripcionCierraEn,
            int capacidadTotal,
            String esquemaFormularioJson) {
        var ahora = Instant.now();
        this.creadoPor = creadoPor;
        this.titulo = titulo;
        this.identificadorUrl = identificadorUrl;
        this.descripcion = descripcion;
        this.lugar = lugar;
        this.iniciaEn = iniciaEn;
        this.finalizaEn = finalizaEn;
        this.inscripcionAbreEn = inscripcionAbreEn;
        this.inscripcionCierraEn = inscripcionCierraEn;
        this.capacidadTotal = capacidadTotal;
        this.cantidadOcupada = 0;
        this.estado = "BORRADOR";
        this.esquemaFormularioJson = esquemaFormularioJson;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
        this.version = null;
    }

    public Long obtenerIdEvento() {
        return idEvento;
    }

    public String obtenerTitulo() {
        return titulo;
    }

    public String obtenerIdentificadorUrl() {
        return identificadorUrl;
    }

    public String obtenerDescripcion() {
        return descripcion;
    }

    public String obtenerLugar() {
        return lugar;
    }

    public Instant obtenerIniciaEn() {
        return iniciaEn;
    }

    public Instant obtenerFinalizaEn() {
        return finalizaEn;
    }

    public Instant obtenerInscripcionAbreEn() {
        return inscripcionAbreEn;
    }

    public Instant obtenerInscripcionCierraEn() {
        return inscripcionCierraEn;
    }

    public int obtenerCapacidadTotal() {
        return capacidadTotal;
    }

    public int obtenerCantidadOcupada() {
        return cantidadOcupada;
    }

    public String obtenerEstado() {
        return estado;
    }

    public String obtenerClaveImagen() {
        return claveImagen;
    }

    public String obtenerEsquemaFormularioJson() {
        return esquemaFormularioJson;
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

    public List<RequisitoEvento> obtenerRequisitos() {
        return List.copyOf(requisitos);
    }

    public void actualizar(
            String titulo,
            String descripcion,
            String lugar,
            Instant iniciaEn,
            Instant finalizaEn,
            Instant inscripcionAbreEn,
            Instant inscripcionCierraEn,
            int capacidadTotal,
            String esquemaFormularioJson) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.lugar = lugar;
        this.iniciaEn = iniciaEn;
        this.finalizaEn = finalizaEn;
        this.inscripcionAbreEn = inscripcionAbreEn;
        this.inscripcionCierraEn = inscripcionCierraEn;
        this.capacidadTotal = capacidadTotal;
        this.esquemaFormularioJson = esquemaFormularioJson;
        this.actualizadoEn = Instant.now();
    }

    public void reemplazarRequisitos(List<RequisitoEvento> nuevosRequisitos) {
        requisitos.clear();
        requisitos.addAll(nuevosRequisitos);
        actualizadoEn = Instant.now();
    }

    public void publicar() {
        estado = "PUBLICADO";
        actualizadoEn = Instant.now();
    }

    public void cerrar() {
        estado = "CERRADO";
        actualizadoEn = Instant.now();
    }

    public void cancelar() {
        estado = "CANCELADO";
        actualizadoEn = Instant.now();
    }

    public void finalizar() {
        estado = "FINALIZADO";
        actualizadoEn = Instant.now();
    }

    public void establecerClaveImagen(String nuevaClave) {
        claveImagen = nuevaClave;
        actualizadoEn = Instant.now();
    }
}
