package gt.gob.parqueerickbarrondo.areas.dominio;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class VerticeAreaMapa {

    @Column(name = "Latitud", nullable = false, precision = 10, scale = 8)
    private BigDecimal latitud;

    @Column(name = "Longitud", nullable = false, precision = 11, scale = 8)
    private BigDecimal longitud;

    protected VerticeAreaMapa() {
    }

    public VerticeAreaMapa(BigDecimal latitud, BigDecimal longitud) {
        this.latitud = latitud;
        this.longitud = longitud;
    }

    public BigDecimal obtenerLatitud() {
        return latitud;
    }

    public BigDecimal obtenerLongitud() {
        return longitud;
    }
}
