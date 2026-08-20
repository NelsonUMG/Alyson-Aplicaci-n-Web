package gt.gob.parqueerickbarrondo.eventos.aplicacion;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;

import gt.gob.parqueerickbarrondo.compartido.idempotencia.ServicioIdempotencia;
import gt.gob.parqueerickbarrondo.compartido.observabilidad.IdentificadorCorrelacion;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.RespuestaInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudCancelacionInscripcion;
import gt.gob.parqueerickbarrondo.eventos.api.modelo.SolicitudInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.dominio.InscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.dominio.Notificacion;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioInscripcionEvento;
import gt.gob.parqueerickbarrondo.eventos.infraestructura.persistencia.RepositorioNotificacion;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ConflictoDatosException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.RecursoNoEncontradoException;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.ServicioAuditoria;
import gt.gob.parqueerickbarrondo.identidad.aplicacion.SolicitudInvalidaException;
import gt.gob.parqueerickbarrondo.identidad.infraestructura.persistencia.RepositorioUsuario;
import gt.gob.parqueerickbarrondo.identidad.seguridad.UsuarioSesion;
import gt.gob.parqueerickbarrondo.portalpublico.api.modelo.RespuestaPaginaPublica;
import gt.gob.parqueerickbarrondo.portalpublico.dominio.Evento;
import gt.gob.parqueerickbarrondo.portalpublico.infraestructura.persistencia.RepositorioEvento;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class ServicioInscripcionesEvento {

    private final RepositorioEvento repositorioEvento;
    private final RepositorioInscripcionEvento repositorioInscripcion;
    private final RepositorioNotificacion repositorioNotificacion;
    private final RepositorioUsuario repositorioUsuario;
    private final ServicioIdempotencia servicioIdempotencia;
    private final ServicioAuditoria servicioAuditoria;
    private final ObjectMapper serializadorJson;

    public ServicioInscripcionesEvento(
            RepositorioEvento repositorioEvento,
            RepositorioInscripcionEvento repositorioInscripcion,
            RepositorioNotificacion repositorioNotificacion,
            RepositorioUsuario repositorioUsuario,
            ServicioIdempotencia servicioIdempotencia,
            ServicioAuditoria servicioAuditoria,
            ObjectMapper serializadorJson) {
        this.repositorioEvento = repositorioEvento;
        this.repositorioInscripcion = repositorioInscripcion;
        this.repositorioNotificacion = repositorioNotificacion;
        this.repositorioUsuario = repositorioUsuario;
        this.servicioIdempotencia = servicioIdempotencia;
        this.servicioAuditoria = servicioAuditoria;
        this.serializadorJson = serializadorJson;
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional
    public RespuestaInscripcionEvento inscribir(
            Long idEvento,
            SolicitudInscripcionEvento solicitud,
            String claveIdempotencia,
            UsuarioSesion actor) {
        var contexto = servicioIdempotencia.preparar(
                claveIdempotencia,
                actor.obtenerIdUsuario(),
                "INSCRIBIREVENTO:" + idEvento,
                solicitud,
                RespuestaInscripcionEvento.class);
        if (contexto.tieneRespuestaRepetida()) {
            return contexto.respuestaRepetida();
        }

        var ahora = Instant.now();
        var eventoInicial = buscarEvento(idEvento);
        validarInscripcionDisponible(eventoInicial, ahora);
        var respuestasFormularioJson = validarYSerializarRespuestas(eventoInicial, solicitud.respuestas());
        var usuario = repositorioUsuario.findById(actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario solicitado."));
          if (!usuario.estaActivo()) {
              throw new SolicitudInvalidaException("La cuenta no está habilitada para inscripciones.");
          }
          var grupoSeleccionado = validarGrupo(eventoInicial, solicitud.codigoGrupo(), usuario.obtenerFechaNacimiento());

        var existente = repositorioInscripcion
                .buscarParaActualizar(idEvento, actor.obtenerIdUsuario())
                .orElse(null);
        if (existente != null && existente.estaConfirmada()) {
            throw new ConflictoDatosException("Ya tienes una inscripción confirmada para este evento.");
        }

        if (repositorioEvento.reservarCupo(idEvento, ahora) != 1) {
            validarInscripcionDisponible(buscarEvento(idEvento), Instant.now());
            throw new SolicitudInvalidaException("No hay cupos disponibles para este evento.");
        }

        var eventoActualizado = buscarEvento(idEvento);
        InscripcionEvento inscripcion;
          if (existente == null) {
              inscripcion = new InscripcionEvento(
                      eventoActualizado, usuario, ahora, respuestasFormularioJson,
                      grupoSeleccionado == null ? null : grupoSeleccionado.codigo());
          } else {
              if (grupoSeleccionado == null) {
                  existente.confirmarNuevamente(ahora, respuestasFormularioJson);
              } else {
                  existente.confirmarNuevamente(
                          ahora, respuestasFormularioJson, grupoSeleccionado.codigo());
              }
              inscripcion = existente;
          }
        inscripcion = repositorioInscripcion.saveAndFlush(inscripcion);
        guardarNotificacion(
                usuario,
                "INSCRIPCIONEVENTOCONFIRMADA",
                "Inscripción confirmada: " + eventoActualizado.obtenerTitulo(),
                eventoActualizado,
                inscripcion);
        auditar(actor.obtenerIdUsuario(), "INSCRIPCIONEVENTOCONFIRMADA", inscripcion);

        var respuesta = convertir(inscripcion, eventoActualizado);
        servicioIdempotencia.completar(contexto, 201, respuesta);
        return respuesta;
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional
    public RespuestaInscripcionEvento cancelar(
            Long idEvento,
            SolicitudCancelacionInscripcion solicitud,
            UsuarioSesion actor) {
        var inscripcion = repositorioInscripcion
                .buscarParaActualizar(idEvento, actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró una inscripción para este evento."));
        var evento = buscarEvento(idEvento);
        if (!inscripcion.estaConfirmada()) {
            return convertir(inscripcion, evento);
        }
        var ahora = Instant.now();
        if (!evento.obtenerIniciaEn().isAfter(ahora)) {
            throw new SolicitudInvalidaException(
                    "La inscripción no puede cancelarse después de iniciar el evento.");
        }
        if (repositorioEvento.liberarCupo(idEvento, ahora) != 1) {
            throw new ConflictoDatosException(
                    "No fue posible liberar el cupo. Recarga los datos e intenta nuevamente.");
        }
        var motivo = solicitud.motivo() == null || solicitud.motivo().isBlank()
                ? null
                : solicitud.motivo().strip();
        inscripcion.cancelar(motivo, ahora);
        inscripcion = repositorioInscripcion.saveAndFlush(inscripcion);
        evento = buscarEvento(idEvento);
        guardarNotificacion(
                inscripcion.obtenerUsuario(),
                "INSCRIPCIONEVENTOCANCELADA",
                "Inscripción cancelada: " + evento.obtenerTitulo(),
                evento,
                inscripcion);
        auditar(actor.obtenerIdUsuario(), "INSCRIPCIONEVENTOCANCELADA", inscripcion);
        return convertir(inscripcion, evento);
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public RespuestaInscripcionEvento consultar(Long idEvento, UsuarioSesion actor) {
        var inscripcion = repositorioInscripcion
                .buscarPorEventoYUsuario(idEvento, actor.obtenerIdUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró una inscripción para este evento."));
        return convertir(inscripcion, inscripcion.obtenerEvento());
    }

    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public RespuestaPaginaPublica<RespuestaInscripcionEvento> listarPropias(
            int numeroPagina,
            int tamano,
            UsuarioSesion actor) {
        var pagina = repositorioInscripcion.buscarPorUsuario(
                actor.obtenerIdUsuario(),
                PageRequest.of(
                        Math.max(numeroPagina, 0),
                        Math.clamp(tamano, 1, 50),
                        Sort.by(Sort.Order.desc("creadoEn"), Sort.Order.desc("idInscripcionEvento"))));
        return new RespuestaPaginaPublica<>(
                pagina.getContent().stream()
                        .map(inscripcion -> convertir(inscripcion, inscripcion.obtenerEvento()))
                        .toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }

    private Evento buscarEvento(Long idEvento) {
        return repositorioEvento.findById(idEvento)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el evento solicitado."));
    }

    private void validarInscripcionDisponible(Evento evento, Instant ahora) {
        if (!"PUBLICADO".equals(evento.obtenerEstado())) {
            throw new SolicitudInvalidaException("El evento no está disponible para inscripciones.");
        }
        if (!evento.obtenerIniciaEn().isAfter(ahora)) {
            throw new SolicitudInvalidaException("El evento ya inició y no admite inscripciones.");
        }
        if (evento.obtenerInscripcionAbreEn() != null && evento.obtenerInscripcionAbreEn().isAfter(ahora)) {
            throw new SolicitudInvalidaException("El periodo de inscripción todavía no está abierto.");
        }
        if (evento.obtenerInscripcionCierraEn() != null && evento.obtenerInscripcionCierraEn().isBefore(ahora)) {
            throw new SolicitudInvalidaException("El periodo de inscripción ya finalizó.");
        }
        if (evento.obtenerCantidadOcupada() >= evento.obtenerCapacidadTotal()) {
            throw new SolicitudInvalidaException("No hay cupos disponibles para este evento.");
        }
    }

      private String validarYSerializarRespuestas(Evento evento, Map<String, Object> respuestas) {
        var esquema = evento.obtenerEsquemaFormularioJson();
        if (esquema == null || esquema.isBlank()) {
            if (!respuestas.isEmpty()) {
                throw new SolicitudInvalidaException(
                        "El evento no solicita requisitos adicionales.");
      }

            return null;
        }
        try {
            var raiz = serializadorJson.readTree(esquema);
            var campos = raiz == null ? null : raiz.get("campos");
            if (campos == null || !campos.isArray()) {
                throw new SolicitudInvalidaException(
                        "La configuración de requisitos del evento no es válida.");
            }
            var clavesPermitidas = new HashSet<String>();
            var normalizadas = new LinkedHashMap<String, Object>();
            for (var campo : campos) {
                var id = textoNodo(campo.get("id"));
                var etiqueta = textoNodo(campo.get("etiqueta"));
                var tipo = textoNodo(campo.get("tipo"));
                if (id.isBlank() || etiqueta.isBlank() || tipo.isBlank() || !clavesPermitidas.add(id)) {
                    throw new SolicitudInvalidaException(
                            "La configuración de requisitos del evento no es válida.");
                }
                var nodoObligatorio = campo.get("obligatorio");
                var obligatorio = nodoObligatorio != null && nodoObligatorio.asBoolean();
                var valor = respuestas.get(id);
                if (valor == null || valor instanceof String texto && texto.isBlank()) {
                    if (obligatorio) {
                        throw new SolicitudInvalidaException(
                                "Debes completar el requisito: " + etiqueta + ".");
                    }
                    continue;
                }
                normalizadas.put(id, normalizarRespuesta(tipo, valor, campo, etiqueta));
            }
            if (!clavesPermitidas.containsAll(respuestas.keySet())) {
                throw new SolicitudInvalidaException(
                        "Se enviaron respuestas que no pertenecen a este evento.");
            }
            return normalizadas.isEmpty() ? null : serializadorJson.writeValueAsString(normalizadas);
        } catch (SolicitudInvalidaException excepcion) {
            throw excepcion;
        } catch (JacksonException excepcion) {
            throw new SolicitudInvalidaException(
                    "No fue posible validar los requisitos de la inscripción.");
        }
    }

    private GrupoSeleccionado validarGrupo(
            Evento evento, String codigoSolicitado, LocalDate fechaNacimiento) {
        var configuracion = evento.obtenerConfiguracionGruposJson();
        if (configuracion == null || configuracion.isBlank()) {
            if (codigoSolicitado != null && !codigoSolicitado.isBlank()) {
                throw new SolicitudInvalidaException("Este evento no utiliza grupos de inscripción.");
            }
            return null;
        }
        if (codigoSolicitado == null || codigoSolicitado.isBlank()) {
            throw new SolicitudInvalidaException("Selecciona el grupo o categoría para la inscripción.");
        }
        try {
            var grupos = serializadorJson.readTree(configuracion).get("grupos");
            for (var grupo : grupos) {
                if (!codigoSolicitado.strip().equals(textoNodo(grupo.get("codigo")))) continue;
                var edadMinima = enteroOpcional(grupo.get("edadMinima"));
                var edadMaxima = enteroOpcional(grupo.get("edadMaxima"));
                if ((edadMinima != null || edadMaxima != null) && fechaNacimiento == null) {
                    throw new SolicitudInvalidaException(
                            "Tu cuenta necesita fecha de nacimiento para validar la categoría de edad.");
                }
                if (fechaNacimiento != null) {
                    var fechaEvento = evento.obtenerIniciaEn()
                            .atZone(ZoneId.of("America/Guatemala")).toLocalDate();
                    var edad = Period.between(fechaNacimiento, fechaEvento).getYears();
                    if (edadMinima != null && edad < edadMinima
                            || edadMaxima != null && edad > edadMaxima) {
                        throw new SolicitudInvalidaException(
                                "Tu edad no corresponde a la categoría del grupo seleccionado.");
                    }
                }
                return new GrupoSeleccionado(
                        codigoSolicitado.strip(), textoNodo(grupo.get("nombre")));
            }
            throw new SolicitudInvalidaException("El grupo seleccionado no pertenece a este evento.");
        } catch (SolicitudInvalidaException excepcion) {
            throw excepcion;
        } catch (JacksonException excepcion) {
            throw new SolicitudInvalidaException(
                    "La configuración de grupos del evento no es válida.");
        }
    }

    private Integer enteroOpcional(tools.jackson.databind.JsonNode nodo) {
        return nodo == null || nodo.isNull() || !nodo.isInt() ? null : nodo.asInt();
    }

    private String nombreGrupo(Evento evento, String codigo) {
        if (codigo == null) return null;
        try {
            var grupos = serializadorJson.readTree(evento.obtenerConfiguracionGruposJson()).get("grupos");
            for (var grupo : grupos) {
                if (codigo.equals(textoNodo(grupo.get("codigo")))) {
                    return textoNodo(grupo.get("nombre"));
                }
            }
        } catch (JacksonException | NullPointerException excepcion) {
            return codigo;
        }
        return codigo;
    }

    private Object normalizarRespuesta(String tipo, Object valor, tools.jackson.databind.JsonNode campo,
            String etiqueta) {
        var texto = String.valueOf(valor).strip();
        return switch (tipo) {
            case "DPI_CUI" -> {
                if (!texto.matches("\\d{13}")) {
                    throw respuestaInvalida(etiqueta, "debe contener exactamente 13 números");
                }
                yield texto;
            }
            case "NUMERO" -> {
                try {
                    yield new BigDecimal(texto).stripTrailingZeros().toPlainString();
                } catch (NumberFormatException excepcion) {
                    throw respuestaInvalida(etiqueta, "debe ser un número válido");
                }
            }
            case "FECHA" -> {
                try {
                    yield LocalDate.parse(texto).toString();
                } catch (DateTimeParseException excepcion) {
                    throw respuestaInvalida(etiqueta, "debe ser una fecha válida");
                }
            }
            case "SI_NO" -> {
                if (!"true".equalsIgnoreCase(texto) && !"false".equalsIgnoreCase(texto)) {
                    throw respuestaInvalida(etiqueta, "debe indicar sí o no");
                }
                yield Boolean.valueOf(texto);
            }
            case "SELECCION_UNICA" -> {
                var opciones = campo.get("opciones");
                var permitida = false;
                if (opciones != null && opciones.isArray()) {
                    for (var opcion : opciones) {
                        if (texto.equals(opcion.asText())) {
                            permitida = true;
                            break;
                        }
                    }
                }
                if (!permitida) {
                    throw respuestaInvalida(etiqueta, "contiene una opción no permitida");
                }
                yield texto;
            }
            case "TEXTO_CORTO" -> validarLongitud(texto, 500, etiqueta);
            case "TEXTO_LARGO" -> validarLongitud(texto, 5000, etiqueta);
            default -> throw respuestaInvalida(etiqueta, "usa un tipo de campo no permitido");
        };
    }

    private String validarLongitud(String texto, int maximo, String etiqueta) {
        if (texto.length() > maximo) {
            throw respuestaInvalida(etiqueta, "supera la longitud permitida");
        }
        return texto;
    }

    private SolicitudInvalidaException respuestaInvalida(String etiqueta, String detalle) {
        return new SolicitudInvalidaException("El requisito " + etiqueta + " " + detalle + ".");
    }

    private String textoNodo(tools.jackson.databind.JsonNode nodo) {
        return nodo == null || !nodo.isTextual() ? "" : nodo.asText().strip();
    }

    private void guardarNotificacion(
            gt.gob.parqueerickbarrondo.identidad.dominio.Usuario usuario,
            String tipo,
            String asunto,
            Evento evento,
            InscripcionEvento inscripcion) {
        var contenido = Map.of(
                "idEvento", evento.obtenerIdEvento(),
                "identificadorUrl", evento.obtenerIdentificadorUrl(),
                "idInscripcionEvento", inscripcion.obtenerIdInscripcionEvento(),
                "estado", inscripcion.obtenerEstado());
        try {
            repositorioNotificacion.save(new Notificacion(
                    usuario,
                    tipo,
                    asunto,
                    serializadorJson.writeValueAsString(contenido)));
        } catch (JacksonException excepcion) {
            throw new IllegalStateException("No fue posible generar la notificación de inscripción.", excepcion);
        }
    }

    private void auditar(Long idUsuario, String accion, InscripcionEvento inscripcion) {
        servicioAuditoria.registrar(
                idUsuario,
                accion,
                "INSCRIPCIONEVENTO",
                inscripcion.obtenerIdInscripcionEvento().toString(),
                "EXITOSO",
                IdentificadorCorrelacion.actual());
    }

    private RespuestaInscripcionEvento convertir(InscripcionEvento inscripcion, Evento evento) {
          return new RespuestaInscripcionEvento(
                  inscripcion.obtenerIdInscripcionEvento(),
                  evento.obtenerIdEvento(),
                  evento.obtenerIdentificadorUrl(),
                  evento.obtenerTitulo(),
                  inscripcion.obtenerGrupoSeleccionadoCodigo(),
                  nombreGrupo(evento, inscripcion.obtenerGrupoSeleccionadoCodigo()),
                  inscripcion.obtenerEstado(),
                evento.obtenerIniciaEn(),
                evento.obtenerLugar(),
                inscripcion.obtenerRequisitosAceptadosEn(),
                inscripcion.obtenerConfirmadaEn(),
                inscripcion.obtenerCanceladaEn(),
                inscripcion.obtenerMotivoCancelacion(),
                Math.max(evento.obtenerCapacidadTotal() - evento.obtenerCantidadOcupada(), 0),
                  inscripcion.obtenerVersion());
      }

      private record GrupoSeleccionado(String codigo, String nombre) {
      }
}
