package gt.gob.parqueerickbarrondo.eventos.api.modelo;

import java.time.LocalDate;
import java.util.Map;

public record RespuestaDetalleParticipante(String nombre, String apellido, LocalDate fechaNacimiento,
        boolean titular, String nombreResponsable, String correo, String fotografia,
        Map<String, String> requisitos) { }
