import { solicitarApi } from "./clienteHttp";

export function listarCategoriasPublicacion() {
  return solicitarApi("/publico/categorias-publicaciones");
}

export function listarPublicaciones({
  busqueda = "",
  categoria = "",
  fechaDesde = "",
  fechaHasta = "",
  pagina = 0,
  tamano = 5,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    categoria,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  if (fechaDesde) parametros.set("fechaDesde", fechaDesde);
  if (fechaHasta) parametros.set("fechaHasta", fechaHasta);
  return solicitarApi(`/publico/publicaciones?${parametros}`);
}

export function consultarPublicacion(identificadorUrl) {
  return solicitarApi(`/publico/publicaciones/${encodeURIComponent(identificadorUrl)}`);
}

export function listarEventos({ pagina = 0, tamano = 10 } = {}) {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) });
  return solicitarApi(`/publico/eventos?${parametros}`);
}

export function consultarEvento(identificadorUrl) {
  return solicitarApi(`/publico/eventos/${encodeURIComponent(identificadorUrl)}`);
}

export function listarAreas() {
  return solicitarApi("/publico/areas");
}

export function consultarMapa() {
  return solicitarApi("/publico/mapa");
}

export function calcularRutaMapa(idOrigen, idDestino, accesible = false) {
  const parametros = new URLSearchParams({
    origen: String(idOrigen),
    destino: String(idDestino),
    accesible: String(accesible),
  });
  return solicitarApi(`/publico/mapa/ruta?${parametros}`);
}

function decodificarPolilinea6(valor) {
  const coordenadas = [];
  const factor = 1e6;
  let indice = 0;
  let latitud = 0;
  let longitud = 0;

  function leerDiferencia() {
    let resultado = 0;
    let desplazamiento = 0;
    let byte;
    do {
      if (indice >= valor.length) throw new Error("La geometría del recorrido está incompleta.");
      byte = valor.charCodeAt(indice) - 63;
      indice += 1;
      resultado |= (byte & 0x1f) << desplazamiento;
      desplazamiento += 5;
    } while (byte >= 0x20);
    return (resultado & 1) ? ~(resultado >> 1) : (resultado >> 1);
  }

  while (indice < valor.length) {
    latitud += leerDiferencia();
    longitud += leerDiferencia();
    coordenadas.push([longitud / factor, latitud / factor]);
  }
  return coordenadas;
}

function validarCoordenada(coordenada, nombre) {
  const latitud = Number(coordenada?.latitud);
  const longitud = Number(coordenada?.longitud);
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)
      || latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
    throw new Error(`La ${nombre} no tiene coordenadas válidas.`);
  }
  return { latitud, longitud };
}

export async function calcularRecorridoPeatonal(origen, destino) {
  const puntoOrigen = validarCoordenada(origen, "ubicación de origen");
  const puntoDestino = validarCoordenada(destino, "cancha seleccionada");
  const urlBase = import.meta.env.VITE_URLSERVICIORUTASPEATONALES
    || "https://valhalla1.openstreetmap.de/route";
  const solicitud = {
    locations: [
      { lat: puntoOrigen.latitud, lon: puntoOrigen.longitud, type: "break" },
      { lat: puntoDestino.latitud, lon: puntoDestino.longitud, type: "break" },
    ],
    costing: "pedestrian",
    directions_options: { units: "kilometers", language: "es-ES" },
  };
  const parametros = new URLSearchParams({ json: JSON.stringify(solicitud) });
  const respuesta = await fetch(`${urlBase}?${parametros}`, {
    headers: {
      Accept: "application/json",
      "X-Client-Id": "parque-erick-barrondo-web",
    },
  });
  if (!respuesta.ok) {
    throw new Error("No fue posible calcular el recorrido peatonal en este momento.");
  }
  const contenido = await respuesta.json();
  const viaje = contenido?.trip;
  const tramos = viaje?.legs || [];
  const coordenadas = tramos.flatMap((tramo, indiceTramo) => {
    const puntos = decodificarPolilinea6(tramo.shape || "");
    return indiceTramo > 0 ? puntos.slice(1) : puntos;
  });
  if (viaje?.status !== 0 || coordenadas.length < 2) {
    throw new Error("No se encontró un camino peatonal hacia la cancha seleccionada.");
  }
  return {
    distanciaTotalMetros: Math.round(Number(viaje.summary?.length || 0) * 1000),
    duracionTotalSegundos: Math.round(Number(viaje.summary?.time || 0)),
    coordenadas,
    instrucciones: tramos.flatMap((tramo) => (tramo.maneuvers || []).map((maniobra) => ({
      instruccion: maniobra.instruction,
      distanciaMetros: Math.round(Number(maniobra.length || 0) * 1000),
      duracionSegundos: Math.round(Number(maniobra.time || 0)),
    }))),
    proveedor: "Valhalla y OpenStreetMap",
  };
}

export function consultarResumenBicicletas() {
  return solicitarApi("/publico/bicicletas/resumen");
}

export function consultarContenidoInstitucional() {
  return solicitarApi("/publico/institucional");
}
