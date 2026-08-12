package gt.gob.parqueerickbarrondo.areas.api.modelo;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudArea(
        @NotNull(message = "La categoría es obligatoria.")
        Long idCategoriaArea,
        @NotBlank(message = "El código es obligatorio.")
        @Size(max = 64, message = "El código no puede superar 64 caracteres.")
        @Pattern(regexp = "[A-Za-z0-9_-]+", message = "El código solo puede contener letras, números, guiones y guion bajo.")
        String codigo,
        @Min(value = 1, message = "El número visible del mapa debe ser positivo.")
        @Max(value = 9999, message = "El número visible del mapa no es válido.")
        Integer numeroVisibleMapa,
        @NotBlank(message = "El nombre es obligatorio.")
        @Size(max = 150, message = "El nombre no puede superar 150 caracteres.")
        String nombre,
        @Size(max = 20000, message = "La descripción no puede superar 20000 caracteres.")
        String descripcion,
        @NotBlank(message = "El estado es obligatorio.")
        @Size(max = 40, message = "El estado no es válido.")
        String estado,
        @Size(max = 300, message = "La disponibilidad no puede superar 300 caracteres.")
        String notaDisponibilidad,
        BigDecimal latitud,
        BigDecimal longitud,
        boolean coordenadasConfirmadas,
        @Valid
        @Size(max = 40, message = "El perímetro no puede superar 40 vértices.")
        List<CoordenadaAreaMapa> perimetro,
        boolean perimetroConfirmado,
        @Size(max = 10000, message = "El horario no puede superar 10000 caracteres.")
        String horarioJson,
        @Size(max = 20000, message = "Las observaciones internas no pueden superar 20000 caracteres.")
        String observacionesInternas,
        @Size(max = 500, message = "El motivo no puede superar 500 caracteres.")
        String motivoCambioEstado,
        Long version) {

    @AssertTrue(message = "La latitud y longitud deben informarse juntas.")
    public boolean coordenadasCompletas() {
        return (latitud == null) == (longitud == null);
    }

    @AssertTrue(message = "Las coordenadas confirmadas deben incluir latitud y longitud.")
    public boolean confirmacionCoherente() {
        return !coordenadasConfirmadas || (latitud != null && longitud != null);
    }

    @AssertTrue(message = "El perímetro debe estar vacío o incluir al menos tres vértices.")
    public boolean perimetroCoherente() {
        return perimetro == null || perimetro.isEmpty() || perimetro.size() >= 3;
    }

    @AssertTrue(message = "Un perímetro confirmado debe incluir al menos tres vértices.")
    public boolean confirmacionPerimetroCoherente() {
        return !perimetroConfirmado || (perimetro != null && perimetro.size() >= 3);
    }
}
