import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

async function enviar(ruta, metodo, datos) {
  await prepararCsrf();
  return solicitarApi(ruta, {
    method: metodo,
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });
}

export function listarCategoriasArea() {
  return solicitarApi("/administracion/categorias-areas");
}

export function crearCategoriaArea(datos) {
  return enviar("/administracion/categorias-areas", "POST", datos);
}

export function actualizarCategoriaArea(idCategoriaArea, datos) {
  return enviar(`/administracion/categorias-areas/${idCategoriaArea}`, "PUT", datos);
}

export function listarAreasAdministradas({
  busqueda = "",
  estado = "",
  idCategoria = "",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    estado,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  if (idCategoria) parametros.set("idCategoria", String(idCategoria));
  return solicitarApi(`/administracion/areas?${parametros}`);
}

export function crearArea(datos) {
  return enviar("/administracion/areas", "POST", datos);
}

export function actualizarArea(idArea, datos) {
  return enviar(`/administracion/areas/${idArea}`, "PUT", datos);
}

export function listarHistorialArea(idArea) {
  return solicitarApi(`/administracion/areas/${idArea}/historial`);
}

export function listarReservasArea(idArea, { desde = "", hasta = "" } = {}) {
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  const sufijo = parametros.toString() ? `?${parametros}` : "";
  return solicitarApi(`/administracion/areas/${idArea}/reservas${sufijo}`);
}

export function crearReservaArea(idArea, datos) {
  return enviar(`/administracion/areas/${idArea}/reservas`, "POST", datos);
}

export function actualizarReservaArea(idArea, idReservaArea, datos) {
  return enviar(`/administracion/areas/${idArea}/reservas/${idReservaArea}`, "PUT", datos);
}

export async function agregarImagenArea(idArea, archivo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/administracion/areas/${idArea}/imagen`, {
    method: "POST",
    body: formulario,
  });
}

export function eliminarImagenArea(idArea) {
  return enviar(`/administracion/areas/${idArea}/imagen`, "DELETE");
}

export function listarNodosMapa() {
  return solicitarApi("/administracion/mapa/nodos");
}

export function crearNodoMapa(datos) {
  return enviar("/administracion/mapa/nodos", "POST", datos);
}

export function actualizarNodoMapa(idNodoMapa, datos) {
  return enviar(`/administracion/mapa/nodos/${idNodoMapa}`, "PUT", datos);
}

export function eliminarNodoMapa(idNodoMapa) {
  return enviar(`/administracion/mapa/nodos/${idNodoMapa}`, "DELETE");
}

export function listarConexionesMapa() {
  return solicitarApi("/administracion/mapa/conexiones");
}

export function crearConexionMapa(datos) {
  return enviar("/administracion/mapa/conexiones", "POST", datos);
}

export function actualizarConexionMapa(idConexionMapa, datos) {
  return enviar(`/administracion/mapa/conexiones/${idConexionMapa}`, "PUT", datos);
}

export function eliminarConexionMapa(idConexionMapa) {
  return enviar(`/administracion/mapa/conexiones/${idConexionMapa}`, "DELETE");
}
