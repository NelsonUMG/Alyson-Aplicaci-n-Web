package gt.gob.parqueerickbarrondo.solicitudes.api.modelo;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudUsoInstalacion(
        @NotBlank(message = "Selecciona una cancha o instalación.")
        @Size(max = 32, message = "La instalación seleccionada no es válida.")
        String codigoArea,
        @NotNull(message = "La fecha solicitada es obligatoria.")
        @FutureOrPresent(message = "La fecha solicitada no puede estar en el pasado.")
        LocalDate fechaSolicitada,
        @NotNull(message = "La hora de inicio es obligatoria.")
        LocalTime horaInicio,
        @NotNull(message = "La hora de finalización es obligatoria.")
        LocalTime horaFin,
        @NotBlank(message = "Indica el tipo de actividad.")
        @Size(max = 120, message = "El tipo de actividad no puede superar 120 caracteres.")
        String tipoActividad,
        @Min(value = 1, message = "La cantidad de personas debe ser mayor que cero.")
        @Max(value = 10000, message = "La cantidad de personas no puede superar 10000.")
        int cantidadPersonas,
        @NotBlank(message = "Describe brevemente la actividad.")
        @Size(max = 3000, message = "La descripción no puede superar 3000 caracteres.")
        String descripcion,
        Long version) {
}
