package gt.gob.parqueerickbarrondo.compartido.api;

import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.CredencialesInvalidasException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.DemasiadosIntentosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class ManejadorErroresApi {

    private static final Logger REGISTRO = LoggerFactory.getLogger(ManejadorErroresApi.class);

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

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail manejarRestriccion(ConstraintViolationException excepcion, HttpServletRequest peticion) {
        var mensaje = excepcion.getConstraintViolations().stream()
                .findFirst()
                .map(violacion -> violacion.getMessage())
                .orElse("Los datos enviados no son válidos.");
        return crearProblema(HttpStatus.BAD_REQUEST, "SOLICITUDINVALIDA", mensaje, peticion);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail manejarArchivoDemasiadoGrande(
            MaxUploadSizeExceededException excepcion,
            HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.CONTENT_TOO_LARGE,
                "ARCHIVODEMASIADOGRANDE",
                "La imagen supera el tamaño máximo permitido.",
                peticion);
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

    @ExceptionHandler(ConflictoDatosException.class)
    ProblemDetail manejarConflicto(ConflictoDatosException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.CONFLICT, "CONFLICTODEDATOS", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler({OptimisticLockException.class, ObjectOptimisticLockingFailureException.class})
    ProblemDetail manejarConflictoVersion(RuntimeException excepcion, HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.CONFLICT,
                "CONFLICTODEDATOS",
                "Los datos cambiaron durante la operación. Recarga e intenta nuevamente.",
                peticion);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail manejarIntegridad(DataIntegrityViolationException excepcion, HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.CONFLICT,
                "CONFLICTODEDATOS",
                "La operación entra en conflicto con datos existentes.",
                peticion);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail manejarAccesoDenegado(AccessDeniedException excepcion, HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.FORBIDDEN,
                "ACCESODENEGADO",
                "No tienes permiso para realizar esta operación.",
                peticion);
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail manejarErrorNoControlado(Exception excepcion, HttpServletRequest peticion) {
        var identificador = IdentificadorCorrelacion.obtener(peticion);
        REGISTRO.error("Error no controlado. idCorrelacion={}", identificador, excepcion);
        return crearProblema(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "ERRORINTERNO",
                "No fue posible completar la solicitud.",
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
        problema.setProperty("idCorrelacion", IdentificadorCorrelacion.obtener(peticion));
        return problema;
    }
}
