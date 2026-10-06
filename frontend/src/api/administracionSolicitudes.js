import { solicitarApi } from "./clienteHttp";
import { prepararCsrf } from "./autenticacion";

export function listarSolicitudesAdministradas({ busqueda = "", estado = "", pagina = 0, tamano = 20 } = {}) {
  const parametros = new URLSearchParams({ busqueda, estado, pagina: String(pagina), tamano: String(tamano) });
  return solicitarApi(`/administracion/solicitudes?${parametros}`, {
    descripcionOperacion: "cargar la lista de solicitudes recibidas",
  });
}

export function consultarSolicitudAdministrada(idSolicitud) {
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}`, {
    descripcionOperacion: `cargar el detalle de la solicitud #${idSolicitud}`,
  });
}

export async function iniciarRevisionSolicitud(idSolicitud, version) {
  await prepararCsrf();
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}/iniciar-revision`, {
    method: "POST",
    body: JSON.stringify({ version }),
    descripcionOperacion: `marcar la solicitud #${idSolicitud} como en revisión`,
  });
}

export async function resolverSolicitud(idSolicitud, decision, respuesta, version) {
  await prepararCsrf();
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}/resolver`, {
    method: "POST",
    body: JSON.stringify({ decision, respuesta, version }),
    descripcionOperacion: `registrar la resolución de la solicitud #${idSolicitud}`,
  });
}

export function listarCatalogoTramitesAdministrado() {
  return solicitarApi("/administracion/solicitudes/catalogo", {
    descripcionOperacion: "cargar los trámites del catálogo",
  });
}

export function listarCategoriasTramitesAdministradas() {
  return solicitarApi("/administracion/solicitudes/catalogo/categorias", {
    descripcionOperacion: "cargar las categorías generales del catálogo",
  });
}

export async function crearCategoriaTramiteAdministrada(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/solicitudes/catalogo/categorias", {
    method: "POST",
    body: JSON.stringify(datos),
    descripcionOperacion: `crear la categoría general «${datos.nombre || "sin nombre"}»`,
  });
}

export async function actualizarCategoriaTramiteAdministrada(idCategoria, datos) {
  await prepararCsrf();
  return solicitarApi(`/administracion/solicitudes/catalogo/categorias/${idCategoria}`, {
    method: "PUT",
    body: JSON.stringify(datos),
    descripcionOperacion: `actualizar la categoría general «${datos.nombre || "sin nombre"}»`,
  });
}

export async function crearTramiteAdministrado(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/solicitudes/catalogo", {
    method: "POST",
    body: JSON.stringify(datos),
    descripcionOperacion: `crear el trámite «${datos.nombre || "sin nombre"}»`,
  });
}

export async function actualizarTramiteAdministrado(idTramite, datos) {
  await prepararCsrf();
  return solicitarApi(`/administracion/solicitudes/catalogo/${idTramite}`, {
    method: "PUT",
    body: JSON.stringify(datos),
    descripcionOperacion: `guardar los cambios del trámite #${idTramite}`,
  });
}

export async function actualizarPortadaTramite(idTramite, archivo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/administracion/solicitudes/catalogo/${idTramite}/portada`, {
    method: "POST",
    body: formulario,
    descripcionOperacion: `cargar la portada del trámite #${idTramite}`,
  });
}
