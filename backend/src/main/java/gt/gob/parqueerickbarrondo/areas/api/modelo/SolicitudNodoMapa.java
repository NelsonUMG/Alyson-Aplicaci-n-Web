package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudNodoMapa(
        Long idArea,
        @NotBlank(message = "El tipo de nodo es obligatorio.")
        @Size(max = 32, message = "El tipo de nodo no es válido.")
        String tipoNodo,
        @NotBlank(message = "El nombre del nodo es obligatorio.")
        @Size(max = 150, message = "El nombre del nodo no puede superar 150 caracteres.")
        String nombre,
        BigDecimal latitud,
        BigDecimal longitud,
        boolean coordenadasConfirmadas,
        boolean accesible,
        Long version) {

    @AssertTrue(message = "La latitud y longitud del nodo deben informarse juntas.")
    public boolean coordenadasCompletas() {
        return (latitud == null) == (longitud == null);
    }

    @AssertTrue(message = "Un nodo confirmado debe incluir latitud y longitud.")
    public boolean confirmacionCoherente() {
        return !coordenadasConfirmadas || (latitud != null && longitud != null);
    }
}
