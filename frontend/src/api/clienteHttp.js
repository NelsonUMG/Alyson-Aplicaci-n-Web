const urlBasePredeterminada = "/api/v1";
const metodosNoSeguros = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ErrorApi extends Error {
  constructor(mensaje, { estado, problema } = {}) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.problema = problema;
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

async function leerProblema(respuesta) {
  const tipoContenido = respuesta.headers.get("content-type") || "";
  if (!tipoContenido.includes("json")) {
    return undefined;
  }

  try {
    return await respuesta.json();
  } catch {
    return undefined;
  }
}

export async function solicitarApi(ruta, opciones = {}) {
  const metodo = (opciones.method || "GET").toUpperCase();
  const encabezados = new Headers(opciones.headers);
  encabezados.set("Accept", "application/json");

  if (opciones.body && !encabezados.has("Content-Type")) {
    encabezados.set("Content-Type", "application/json");
  }

  if (metodosNoSeguros.has(metodo)) {
    const tokenCsrf = leerCookie("XSRF-TOKEN");
    if (tokenCsrf) {
      encabezados.set("X-XSRF-TOKEN", tokenCsrf);
    }
  }

  const rutaNormalizada = ruta.startsWith("/") ? ruta : `/${ruta}`;
  const respuesta = await fetch(`${obtenerUrlBaseApi()}${rutaNormalizada}`, {
    ...opciones,
    method: metodo,
    headers: encabezados,
    credentials: "include",
  });

  if (!respuesta.ok) {
    const problema = await leerProblema(respuesta);
    if (respuesta.status === 401 && problema?.codigo === "AUTENTICACIONREQUERIDA") {
      window.dispatchEvent(new Event("sesionexpirada"));
    }
    throw new ErrorApi(problema?.detail || "No fue posible completar la solicitud.", {
      estado: respuesta.status,
      problema,
    });
  }

  if (respuesta.status === 204) {
    return undefined;
  }

  return respuesta.json();
}
