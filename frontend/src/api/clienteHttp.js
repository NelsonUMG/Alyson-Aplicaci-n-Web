import { diagnosticarError } from "../utilidades/diagnosticoErrores";

const urlBasePredeterminada = "/api/v1";
const metodosNoSeguros = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const estadosServicioNoDisponible = new Set([502, 503, 504]);
const tiempoEsperaPredeterminadoMs = 30000;
let tokenCsrfActual = "";
let estadoConexionApi = {
  disponible: true,
  mensaje: "",
  codigoSoporte: "",
  tipoError: "",
  detalleSoporte: "",
  referencia: "",
};

const mensajesPorEstado = {
  400: "Los datos enviados no son válidos. Revisa la información e intenta nuevamente.",
  401: "Tu sesión no está disponible. Inicia sesión nuevamente.",
  403: "No tienes permiso para realizar esta operación.",
  404: "No se encontró el recurso solicitado.",
  405: "La operación solicitada no está permitida.",
  408: "La solicitud tardó demasiado. Intenta nuevamente.",
  409: "Los datos cambiaron o entran en conflicto. Actualiza la información e intenta nuevamente.",
  413: "El archivo supera el tamaño máximo permitido.",
  415: "El formato del contenido enviado no es compatible.",
  422: "No fue posible procesar los datos enviados.",
  429: "Se realizaron demasiados intentos. Espera un momento antes de volver a intentar.",
  500: "El servidor no pudo completar la operación.",
  502: "El servicio no está disponible en este momento.",
  503: "El servicio no está disponible en este momento.",
  504: "El servidor tardó demasiado en responder.",
};

export class ErrorApi extends Error {
  constructor(mensaje, {
    estado,
    codigo,
    problema,
    idCorrelacion,
    codigoSoporte,
    tipoError,
    detalleSoporte,
    metodo,
    ruta,
    operacion,
    recuperable = false,
    causa,
  } = {}) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.codigo = codigo || problema?.codigo;
    this.problema = problema;
    this.idCorrelacion = idCorrelacion || problema?.idCorrelacion;
    this.codigoSoporte = codigoSoporte;
    this.tipoError = tipoError;
    this.detalleSoporte = detalleSoporte;
    this.metodo = metodo;
    this.ruta = ruta || problema?.ruta;
    this.operacion = operacion;
    this.recuperable = recuperable;
    if (causa) this.cause = causa;
  }
}

function obtenerUrlBaseApi() {
  const urlConfigurada = import.meta.env.VITE_URLBASEAPI || urlBasePredeterminada;
  return urlConfigurada.replace(/\/$/, "");
}

function leerCookie(nombre) {
  const prefijo = `${encodeURIComponent(nombre)}=`;
  const cookie = document.cookie
    .split(";")
    .map((entrada) => entrada.trim())
    .find((entrada) => entrada.startsWith(prefijo));

  return cookie ? decodeURIComponent(cookie.slice(prefijo.length)) : undefined;
}

export function recordarTokenCsrf(token) {
  tokenCsrfActual = token || "";
}

export function obtenerEstadoConexionApi() {
  return estadoConexionApi;
}

function publicarEstadoConexion(disponible, error) {
  const siguiente = disponible
    ? { disponible: true, mensaje: "", codigoSoporte: "", tipoError: "", detalleSoporte: "", referencia: "" }
    : {
        disponible: false,
        mensaje: error?.message || "El servicio no está disponible en este momento.",
        codigoSoporte: error?.codigoSoporte || "ERR-CON-000",
        tipoError: error?.tipoError || "Servidor sin respuesta",
        detalleSoporte: error?.detalleSoporte || "No fue posible confirmar la disponibilidad de la API.",
        referencia: error?.idCorrelacion || "",
      };
  if (JSON.stringify(estadoConexionApi) === JSON.stringify(siguiente)) return;
  estadoConexionApi = siguiente;
  window.dispatchEvent(new window.CustomEvent("estadoconexionapi", { detail: estadoConexionApi }));
}

function publicarErrorOperacion(error) {
  window.dispatchEvent(new window.CustomEvent("erroroperacionapi", { detail: error }));
}

function crearReferenciaLocal() {
  const identificador = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `LOCAL-${identificador}`;
}

function esEstadoRecuperable(estado) {
  return estado >= 500 || [408, 409, 425, 429].includes(estado);
}

async function leerProblema(respuesta) {
  const tipoContenido = respuesta.headers.get("content-type") || "";
  if (!tipoContenido.includes("json")) return undefined;

  try {
    return await respuesta.json();
  } catch {
    return undefined;
  }
}

function crearMensajeErrorDetallado({ estado, codigo, detalle, metodo, ruta, operacion, problema }) {
  const inicio = operacion
    ? `No se pudo ${operacion}.`
    : "No se pudo completar la operación solicitada.";
  const identificacion = `El servidor respondió HTTP ${estado} (${codigo}) al ejecutar ${metodo} ${ruta}.`;

  if (estado === 405) {
    const metodosPermitidos = Array.isArray(problema?.metodosPermitidos) && problema.metodosPermitidos.length
      ? ` Esta ruta solo admite: ${problema.metodosPermitidos.join(", ")}.`
      : "";
    return `${inicio} ${identificacion}${metodosPermitidos} Verifica que el frontend y el backend correspondan a la misma versión y reinicia el backend después de compilar cambios de API.`;
  }

  const recomendaciones = {
    400: "Revisa los campos señalados y corrige sus valores antes de intentarlo nuevamente.",
    401: "La sesión puede haber vencido; vuelve a iniciar sesión y repite la operación.",
    403: "La cuenta autenticada no posee el permiso requerido para esta acción.",
    404: "Verifica que el recurso todavía exista y que la versión desplegada incluya esta ruta.",
    409: "Los datos fueron modificados o ya existe un registro incompatible; recarga la información antes de guardar.",
    413: "Selecciona un archivo de menor tamaño y vuelve a cargarlo.",
    415: "Usa uno de los formatos admitidos por la operación.",
    429: "Espera a que finalice el periodo de bloqueo antes de repetir el intento.",
  };
  return [inicio, detalle, identificacion, recomendaciones[estado]].filter(Boolean).join(" ");
}

function crearErrorRespuesta(respuesta, problema, contexto) {
  const estado = respuesta.status;
  const codigo = problema?.codigo || `HTTP${estado}`;
  const idCorrelacion = problema?.idCorrelacion
    || respuesta.headers.get("X-Correlation-ID")
    || undefined;
  const diagnostico = diagnosticarError({ estado, codigo });
  const detalleApi = typeof problema?.detail === "string" && problema.detail.trim()
    ? problema.detail.trim()
    : mensajesPorEstado[estado] || "No fue posible completar la operación.";
  const detalleSeguro = estado >= 500 ? diagnostico.mensajeUsuario : detalleApi;
  const metodo = problema?.metodo || contexto.metodo;
  const ruta = problema?.ruta || contexto.ruta;
  const mensajeUsuario = crearMensajeErrorDetallado({
    estado,
    codigo,
    detalle: detalleSeguro,
    metodo,
    ruta,
    operacion: contexto.operacion,
    problema,
  });
  return new ErrorApi(mensajeUsuario, {
    estado,
    codigo,
    problema,
    idCorrelacion,
    codigoSoporte: diagnostico.codigoSoporte,
    tipoError: diagnostico.tipo,
    detalleSoporte: diagnostico.detalleSoporte,
    metodo,
    ruta,
    operacion: contexto.operacion,
    recuperable: esEstadoRecuperable(estado),
  });
}

function crearErrorConexion(error, tiempoAgotado, contexto) {
  const prefijo = contexto.operacion
    ? `No se pudo ${contexto.operacion}.`
    : "No se pudo completar la operación solicitada.";
  const identificacion = `Operación: ${contexto.metodo} ${contexto.ruta}.`;
  if (tiempoAgotado) {
    const diagnostico = diagnosticarError({ codigo: "TIEMPOESPERAAGOTADO" });
    return new ErrorApi(`${prefijo} ${diagnostico.mensajeUsuario} ${identificacion}`, {
      codigo: "TIEMPOESPERAAGOTADO",
      codigoSoporte: diagnostico.codigoSoporte,
      tipoError: diagnostico.tipo,
      detalleSoporte: diagnostico.detalleSoporte,
      metodo: contexto.metodo,
      ruta: contexto.ruta,
      operacion: contexto.operacion,
      idCorrelacion: crearReferenciaLocal(),
      recuperable: true,
      causa: error,
    });
  }
  if (error?.name === "AbortError") {
    return new ErrorApi("La operación fue cancelada.", {
      codigo: "OPERACIONCANCELADA",
      recuperable: true,
      causa: error,
      metodo: contexto.metodo,
      ruta: contexto.ruta,
      operacion: contexto.operacion,
    });
  }
  const diagnostico = diagnosticarError({ codigo: "SERVIDORNODISPONIBLE" });
  return new ErrorApi(`${prefijo} ${diagnostico.mensajeUsuario} ${identificacion}`, {
      codigo: "SERVIDORNODISPONIBLE",
      codigoSoporte: diagnostico.codigoSoporte,
      tipoError: diagnostico.tipo,
      detalleSoporte: diagnostico.detalleSoporte,
      metodo: contexto.metodo,
      ruta: contexto.ruta,
      operacion: contexto.operacion,
      idCorrelacion: crearReferenciaLocal(),
      recuperable: true,
      causa: error,
  });
}

export function obtenerMensajeError(error, mensajePredeterminado = "No fue posible completar la operación.") {
  return error instanceof Error && error.message?.trim()
    ? error.message
    : mensajePredeterminado;
}

export async function solicitarApi(ruta, opciones = {}) {
  const {
    tiempoEsperaMs = tiempoEsperaPredeterminadoMs,
    descripcionOperacion = "",
    signal: senalExterna,
    ...opcionesFetch
  } = opciones;
  const metodo = (opcionesFetch.method || "GET").toUpperCase();
  const encabezados = new Headers(opcionesFetch.headers);
  encabezados.set("Accept", "application/json");

  const esFormulario = typeof window.FormData !== "undefined"
    && opcionesFetch.body instanceof window.FormData;
  if (opcionesFetch.body && !esFormulario && !encabezados.has("Content-Type")) {
    encabezados.set("Content-Type", "application/json");
  }

  if (metodosNoSeguros.has(metodo)) {
    const tokenCsrf = tokenCsrfActual || leerCookie("XSRF-TOKEN");
    if (tokenCsrf) encabezados.set("X-XSRF-TOKEN", tokenCsrf);
  }

  const controlador = new AbortController();
  let tiempoAgotado = false;
  const cancelarDesdeExterior = () => controlador.abort();
  if (senalExterna) {
    if (senalExterna.aborted) controlador.abort();
    else senalExterna.addEventListener("abort", cancelarDesdeExterior, { once: true });
  }
  const temporizador = tiempoEsperaMs > 0
    ? window.setTimeout(() => {
        tiempoAgotado = true;
        controlador.abort();
      }, tiempoEsperaMs)
    : undefined;

  const rutaNormalizada = ruta.startsWith("/") ? ruta : `/${ruta}`;
  const contexto = { metodo, ruta: rutaNormalizada, operacion: descripcionOperacion };
  let respuesta;
  try {
    respuesta = await fetch(`${obtenerUrlBaseApi()}${rutaNormalizada}`, {
      ...opcionesFetch,
      method: metodo,
      headers: encabezados,
      credentials: "include",
      signal: controlador.signal,
    });
  } catch (error) {
    const errorConexion = crearErrorConexion(error, tiempoAgotado, contexto);
    if (errorConexion.codigo !== "OPERACIONCANCELADA") {
      publicarEstadoConexion(false, errorConexion);
    }
    throw errorConexion;
  } finally {
    if (temporizador !== undefined) window.clearTimeout(temporizador);
    senalExterna?.removeEventListener("abort", cancelarDesdeExterior);
  }

  const tipoContenidoRespuesta = respuesta.headers.get("content-type") || "";

  if (!respuesta.ok) {
    const problema = await leerProblema(respuesta);
    const errorRespuesta = crearErrorRespuesta(respuesta, problema, contexto);
    const pareceFalloDeInfraestructura = estadosServicioNoDisponible.has(respuesta.status)
      || (respuesta.status >= 500 && !tipoContenidoRespuesta.includes("json"));
    publicarEstadoConexion(!pareceFalloDeInfraestructura, pareceFalloDeInfraestructura ? errorRespuesta : undefined);
    if (respuesta.status >= 500 && !pareceFalloDeInfraestructura) publicarErrorOperacion(errorRespuesta);
    if (respuesta.status === 401 && problema?.codigo === "AUTENTICACIONREQUERIDA") {
      window.dispatchEvent(new Event("sesionexpirada"));
    }
    throw errorRespuesta;
  }

  publicarEstadoConexion(true);

  if (respuesta.status === 204 || respuesta.status === 205) return undefined;

  if (!tipoContenidoRespuesta.includes("json")) {
    throw new ErrorApi("El servidor devolvió una respuesta con un formato inesperado.", {
      estado: respuesta.status,
      codigo: "RESPUESTAINVALIDA",
      idCorrelacion: respuesta.headers.get("X-Correlation-ID") || undefined,
      recuperable: true,
    });
  }
  try {
    return await respuesta.json();
  } catch (error) {
    throw new ErrorApi("El servidor devolvió una respuesta que no se pudo procesar.", {
      estado: respuesta.status,
      codigo: "RESPUESTAINVALIDA",
      idCorrelacion: respuesta.headers.get("X-Correlation-ID") || undefined,
      recuperable: true,
      causa: error,
    });
  }
}
