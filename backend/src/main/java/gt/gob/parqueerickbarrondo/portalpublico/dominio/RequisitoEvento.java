package gt.gob.parqueerickbarrondo.portalpublico.dominio;

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
@Table(name = "RequisitosEvento", schema = "dbo")
public class RequisitoEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdRequisitoEvento")
    private Long idRequisitoEvento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "IdEvento", nullable = false)
    private Evento evento;

    @Column(name = "Descripcion", nullable = false, length = 500)
    private String descripcion;

    @Column(name = "Obligatorio", nullable = false)
    private boolean obligatorio;

    @Column(name = "OrdenVisualizacion", nullable = false)
    private Short ordenVisualizacion;

    protected RequisitoEvento() {
    }

    public RequisitoEvento(
            Evento evento,
            String descripcion,
            boolean obligatorio,
            short ordenVisualizacion) {
        this.evento = evento;
        this.descripcion = descripcion;
        this.obligatorio = obligatorio;
        this.ordenVisualizacion = ordenVisualizacion;
    }

    public Long obtenerIdRequisitoEvento() {
        return idRequisitoEvento;
    }

    public String obtenerDescripcion() {
        return descripcion;
    }

    public boolean esObligatorio() {
        return obligatorio;
    }

    public short obtenerOrdenVisualizacion() {
        return ordenVisualizacion;
    }
}
