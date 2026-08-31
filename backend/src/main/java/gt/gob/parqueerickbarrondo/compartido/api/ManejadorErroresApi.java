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
import java.util.LinkedHashMap;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.HttpStatus;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.http.ProblemDetail;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ManejadorErroresApi {

    private static final Logger REGISTRO = LoggerFactory.getLogger(ManejadorErroresApi.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail manejarValidacion(MethodArgumentNotValidException excepcion, HttpServletRequest peticion) {
        var errores = new LinkedHashMap<String, String>();
        excepcion.getBindingResult().getFieldErrors().forEach(error ->
                errores.putIfAbsent(error.getField(), error.getDefaultMessage()));
        var detalleCampos = errores.entrySet().stream()
                .map(entrada -> entrada.getKey() + ": " + entrada.getValue())
                .collect(java.util.stream.Collectors.joining("; "));
        var mensaje = errores.isEmpty()
                ? "Los datos enviados no son válidos."
                : "Corrige los campos indicados: " + detalleCampos
                        + (detalleCampos.endsWith(".") ? "" : ".");
        var problema = crearProblema(HttpStatus.BAD_REQUEST, "SOLICITUDINVALIDA", mensaje, peticion);
        problema.setProperty("erroresCampos", errores);
        return problema;
    }

    @ExceptionHandler(SolicitudInvalidaException.class)
    ProblemDetail manejarSolicitudInvalida(SolicitudInvalidaException excepcion, HttpServletRequest peticion) {
        return crearProblema(HttpStatus.BAD_REQUEST, "SOLICITUDINVALIDA", excepcion.getMessage(), peticion);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HandlerMethodValidationException.class
    })
    ProblemDetail manejarPeticionNoLegible(Exception excepcion, HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.BAD_REQUEST,
                "SOLICITUDINVALIDA",
                "La solicitud contiene datos ausentes o con un formato no válido.",
                peticion);
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
                "El archivo supera el tamaño máximo permitido.",
                peticion);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ProblemDetail manejarRutaNoEncontrada(NoResourceFoundException excepcion, HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.NOT_FOUND,
                "RECURSONOENCONTRADO",
                "No se encontró el recurso solicitado.",
                peticion);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ProblemDetail manejarMetodoNoPermitido(
            HttpRequestMethodNotSupportedException excepcion,
            HttpServletRequest peticion) {
        var permitidos = excepcion.getSupportedHttpMethods() == null
                ? java.util.List.<String>of()
                : excepcion.getSupportedHttpMethods().stream().map(Object::toString).sorted().toList();
        var detallePermitidos = permitidos.isEmpty()
                ? "La ruta no publica métodos compatibles."
                : "Métodos permitidos: " + String.join(", ", permitidos) + ".";
        var problema = crearProblema(
                HttpStatus.METHOD_NOT_ALLOWED,
                "METODONOPERMITIDO",
                "La ruta " + peticion.getRequestURI() + " no acepta el método HTTP "
                        + peticion.getMethod() + ". " + detallePermitidos,
                peticion);
        problema.setProperty("metodosPermitidos", permitidos);
        return problema;
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ProblemDetail manejarTipoContenidoNoCompatible(
            HttpMediaTypeNotSupportedException excepcion,
            HttpServletRequest peticion) {
        var formatos = excepcion.getSupportedMediaTypes().stream().map(Object::toString).toList();
        var problema = crearProblema(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "FORMATONOCOMPATIBLE",
                formatos.isEmpty()
                        ? "El formato del contenido enviado no es compatible con esta operación."
                        : "El formato del contenido enviado no es compatible. Formatos admitidos: "
                                + String.join(", ", formatos) + ".",
                peticion);
        problema.setProperty("formatosAdmitidos", formatos);
        return problema;
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

    @ExceptionHandler(CannotGetJdbcConnectionException.class)
    ProblemDetail manejarBaseDatosNoDisponible(
            CannotGetJdbcConnectionException excepcion,
            HttpServletRequest peticion) {
        var identificador = IdentificadorCorrelacion.obtener(peticion);
        REGISTRO.error("Base de datos no disponible. idCorrelacion={}", identificador, excepcion);
        return crearProblema(
                HttpStatus.SERVICE_UNAVAILABLE,
                "BASEDEDATOSNODISPONIBLE",
                "El servicio no está disponible temporalmente. Intenta nuevamente más tarde.",
                peticion);
    }

    @ExceptionHandler(AsyncRequestTimeoutException.class)
    ProblemDetail manejarTiempoEsperaAgotado(
            AsyncRequestTimeoutException excepcion,
            HttpServletRequest peticion) {
        return crearProblema(
                HttpStatus.GATEWAY_TIMEOUT,
                "TIEMPOESPERAAGOTADO",
                "El servidor tardó demasiado en completar la operación.",
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
        problema.setProperty("metodo", peticion.getMethod());
        problema.setProperty("idCorrelacion", IdentificadorCorrelacion.obtener(peticion));
        return problema;
    }
}
