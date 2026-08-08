import { solicitarApi } from "./clienteHttp";
import { prepararCsrf } from "./autenticacion";

export function listarCategoriasAdministradas() {
  return solicitarApi("/administracion/categorias-publicaciones");
}

export async function crearCategoria(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/categorias-publicaciones", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarCategoria(idCategoria, datos) {
  await prepararCsrf();
  return solicitarApi(`/administracion/categorias-publicaciones/${idCategoria}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function listarPublicacionesAdministradas({
  busqueda = "",
  estado = "",
  idCategoria = "",
  orden = "ACTUALIZACION",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    estado,
    orden,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  if (idCategoria) parametros.set("idCategoria", String(idCategoria));
  return solicitarApi(`/administracion/publicaciones?${parametros}`);
}

export function consultarPublicacionAdministrada(idPublicacion) {
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}`);
}

export function previsualizarPublicacion(idPublicacion) {
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}/previsualizacion`);
}

export async function crearPublicacion(datos, claveIdempotencia) {
  await prepararCsrf();
  return solicitarApi("/administracion/publicaciones", {
    method: "POST",
    headers: { "Idempotency-Key": claveIdempotencia },
    body: JSON.stringify(datos),
  });
}

export async function actualizarPublicacion(idPublicacion, datos) {
  await prepararCsrf();
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

async function cambiarEstado(idPublicacion, accion, version) {
  await prepararCsrf();
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}/${accion}`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

export function publicarPublicacion(idPublicacion, version) {
  return cambiarEstado(idPublicacion, "publicar", version);
}

export function despublicarPublicacion(idPublicacion, version) {
  return cambiarEstado(idPublicacion, "despublicar", version);
}

export function archivarPublicacion(idPublicacion, version) {
  return cambiarEstado(idPublicacion, "archivar", version);
}

export function listarImagenesPublicacion(idPublicacion) {
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}/imagenes`);
}

export async function agregarImagenPublicacion(idPublicacion, archivo, textoAlternativo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  formulario.append("textoAlternativo", textoAlternativo);
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}/imagenes`, {
    method: "POST",
    body: formulario,
  });
}

export async function eliminarImagenPublicacion(idPublicacion, idImagen) {
  await prepararCsrf();
  return solicitarApi(`/administracion/publicaciones/${idPublicacion}/imagenes/${idImagen}`, {
    method: "DELETE",
  });
}
