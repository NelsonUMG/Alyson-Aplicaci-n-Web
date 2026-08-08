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

export function consultarResumenBicicletas() {
  return solicitarApi("/publico/bicicletas/resumen");
}

export function consultarContenidoInstitucional() {
  return solicitarApi("/publico/institucional");
}
