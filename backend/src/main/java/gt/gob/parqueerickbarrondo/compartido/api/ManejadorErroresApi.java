package gt.gob.parqueerickbarrondo.compartido.api;

import java.util.UUID;

import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.CredencialesInvalidasException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.DemasiadosIntentosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ManejadorErroresApi {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail manejarValidacion(MethodArgumentNotValidException excepcion, HttpServletRequest peticion) {
        var mensaje = excepcion.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Los datos enviados no son válidos.");
        return crearProblema(HttpStatus.BAD_REQUEST, "SOLICITUDINVALIDA", mensaje, peticion);
    }

    @ExceptionHandler(SolicitudInvalidaException.class)
    ProblemDetail manejarSolicitudInvalida(SolicitudInvalidaException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.BAD_REQUEST, "SOLICITUDINVALIDA", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    ProblemDetail manejarCredenciales(CredencialesInvalidasException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.UNAUTHORIZED, "CREDENCIALESINVALIDAS", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler(DemasiadosIntentosException.class)
    ProblemDetail manejarLimite(DemasiadosIntentosException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.TOO_MANY_REQUESTS, "DEMASIADOSINTENTOS", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    ProblemDetail manejarNoEncontrado(RecursoNoEncontradoException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.NOT_FOUND, "RECURSONOENCONTRADO", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler({ConflictoDatosException.class, OptimisticLockException.class})
    ProblemDetail manejarConflicto(RuntimeException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.CONFLICT, "CONFLICTODEDATOS", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail manejarAccesoDenegado(AccessDeniedException excepcion, HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.FORBIDDEN,
                "ACCESODENEGADO",
                "No tienes permiso para realizar esta operación.",
                peticion);
    }

    private ProblemDetail crearProblema(
            HttpStatus estado,
            String codigo,
            String detalle,
            HttpServletRequest peticion) {
        var problema = ProblemDetail.forStatusAndDetail(estado, detalle);
        problema.setTitle(estado.getReasonPhrase());
        problema.setProperty("codigo", codigo);
        problema.setProperty("ruta", peticion.getRequestURI());
        problema.setProperty("idCorrelacion", UUID.randomUUID().toString());
        return problema;
    }
}
