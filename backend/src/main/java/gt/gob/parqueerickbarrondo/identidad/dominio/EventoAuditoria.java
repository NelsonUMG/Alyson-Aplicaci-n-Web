package gt.gob.parqueerickbarrondo.identidad.dominio;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "EventosAuditoria", schema = "dbo")
public class EventoAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "IdEventoAuditoria")
    private Long idEventoAuditoria;

    @Column(name = "IdUsuarioActor")
    private Long idUsuarioActor;

    @Column(name = "CodigoAccion", nullable = false, length = 80)
    private String codigoAccion;

    @Column(name = "TipoRecurso", nullable = false, length = 80)
    private String tipoRecurso;

    @Column(name = "IdRecurso", length = 80)
    private String idRecurso;

    @Column(name = "Resultado", nullable = false, length = 32)
    private String resultado;

    @Column(name = "IdCorrelacion", nullable = false, length = 64)
    private String idCorrelacion;

    @Column(name = "OcurridoEn", nullable = false)
    private Instant ocurridoEn;

    protected EventoAuditoria() {
    }

    public EventoAuditoria(
            Long idUsuarioActor,
            String codigoAccion,
            String tipoRecurso,
            String idRecurso,
            String resultado,
            String idCorrelacion) {
        this.idUsuarioActor = idUsuarioActor;
        this.codigoAccion = codigoAccion;
        this.tipoRecurso = tipoRecurso;
        this.idRecurso = idRecurso;
        this.resultado = resultado;
        this.idCorrelacion = idCorrelacion;
        this.ocurridoEn = Instant.now();
    }
}
