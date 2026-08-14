import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

export function listarEventosAdministrados({
  busqueda = "",
  estado = "",
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
  return solicitarApi(`/administracion/eventos?${parametros}`);
}

export function consultarEventoAdministrado(idEvento) {
  return solicitarApi(`/administracion/eventos/${idEvento}`);
}

export async function crearEvento(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/eventos", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarEvento(idEvento, datos) {
  await prepararCsrf();
  return solicitarApi(`/administracion/eventos/${idEvento}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

async function cambiarEstado(idEvento, accion, version) {
  await prepararCsrf();
  return solicitarApi(`/administracion/eventos/${idEvento}/${accion}`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

export function publicarEvento(idEvento, version) {
  return cambiarEstado(idEvento, "publicar", version);
}

export function cerrarEvento(idEvento, version) {
  return cambiarEstado(idEvento, "cerrar", version);
}

export function cancelarEvento(idEvento, version) {
  return cambiarEstado(idEvento, "cancelar", version);
}

export function finalizarEvento(idEvento, version) {
  return cambiarEstado(idEvento, "finalizar", version);
}

export async function agregarImagenEvento(idEvento, archivo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/administracion/eventos/${idEvento}/imagen`, {
    method: "POST",
    body: formulario,
  });
}

export async function eliminarImagenEvento(idEvento) {
  await prepararCsrf();
  return solicitarApi(`/administracion/eventos/${idEvento}/imagen`, {
    method: "DELETE",
  });
}

export function listarImagenesSecundariasEvento(idEvento) {
  return solicitarApi(`/administracion/eventos/${idEvento}/imagenes-secundarias`);
}

export async function agregarImagenSecundariaEvento(idEvento, archivo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/administracion/eventos/${idEvento}/imagenes-secundarias`, {
    method: "POST",
    body: formulario,
  });
}

export async function eliminarImagenSecundariaEvento(idEvento, idImagenEvento) {
  await prepararCsrf();
  return solicitarApi(
    `/administracion/eventos/${idEvento}/imagenes-secundarias/${idImagenEvento}`,
    { method: "DELETE" },
  );
}

export function listarInscripcionesAdministradas(idEvento, {
  busqueda = "",
  estado = "",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    busqueda,
    estado,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return solicitarApi(`/administracion/eventos/${idEvento}/inscripciones?${parametros}`);
}
