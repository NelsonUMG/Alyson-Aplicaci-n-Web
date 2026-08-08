package gt.gob.parqueerickbarrondo.institucional.dominio;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "ContenidoInstitucional", schema = "dbo")
public class ContenidoInstitucional {

    @Id
    @Column(name = "IdContenidoInstitucional")
    private Long idContenidoInstitucional;

    @Column(name = "Resumen", nullable = false, length = 1000)
    private String resumen;

    @Column(name = "Mision", nullable = false, length = 4000)
    private String mision;

    @Column(name = "Vision", nullable = false, length = 4000)
    private String vision;

    @Column(name = "Valores", nullable = false, length = 4000)
    private String valores;

    @Column(name = "ActualizadoPor")
    private Long actualizadoPor;

    @Column(name = "ActualizadoEn", nullable = false)
    private Instant actualizadoEn;

    @Version
    @Column(name = "Version", nullable = false)
    private Long version;

    protected ContenidoInstitucional() {
    }

    public ContenidoInstitucional(String resumen, String mision, String vision, String valores) {
        this.idContenidoInstitucional = 1L;
        this.resumen = resumen;
        this.mision = mision;
        this.vision = vision;
        this.valores = valores;
        this.actualizadoEn = Instant.now();
        this.version = null;
    }

    public Long obtenerIdContenidoInstitucional() {
        return idContenidoInstitucional;
    }

    public String obtenerResumen() {
        return resumen;
    }

    public String obtenerMision() {
        return mision;
    }

    public String obtenerVision() {
        return vision;
    }

    public String obtenerValores() {
        return valores;
    }

    public Instant obtenerActualizadoEn() {
        return actualizadoEn;
    }

    public Long obtenerVersion() {
        return version;
    }

    public void actualizar(
            String nuevoResumen,
            String nuevaMision,
            String nuevaVision,
            String nuevosValores,
            Long idUsuarioActualizador) {
        resumen = nuevoResumen;
        mision = nuevaMision;
        vision = nuevaVision;
        valores = nuevosValores;
        actualizadoPor = idUsuarioActualizador;
        actualizadoEn = Instant.now();
    }
}
