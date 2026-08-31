import { solicitarApi } from "./clienteHttp";

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

export function iniciarRevisionSolicitud(idSolicitud, version) {
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}/iniciar-revision`, {
    method: "POST",
    body: JSON.stringify({ version }),
    descripcionOperacion: `marcar la solicitud #${idSolicitud} como en revisión`,
  });
}

export function resolverSolicitud(idSolicitud, decision, respuesta, version) {
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}/resolver`, {
    method: "POST",
    body: JSON.stringify({ decision, respuesta, version }),
    descripcionOperacion: `registrar la resolución de la solicitud #${idSolicitud}`,
  });
}

export function listarCatalogoTramitesAdministrado() {
  return solicitarApi("/administracion/solicitudes/catalogo", {
    descripcionOperacion: "cargar los trámites hijo del catálogo",
  });
}

export function listarCategoriasTramitesAdministradas() {
  return solicitarApi("/administracion/solicitudes/catalogo/categorias", {
    descripcionOperacion: "cargar las categorías padre del catálogo",
  });
}

export function crearCategoriaTramiteAdministrada(datos) {
  return solicitarApi("/administracion/solicitudes/catalogo/categorias", {
    method: "POST",
    body: JSON.stringify(datos),
    descripcionOperacion: `crear la categoría padre «${datos.nombre || "sin nombre"}»`,
  });
}

export function crearTramiteAdministrado(datos) {
  return solicitarApi("/administracion/solicitudes/catalogo", {
    method: "POST",
    body: JSON.stringify(datos),
    descripcionOperacion: `crear el trámite hijo «${datos.nombre || "sin nombre"}»`,
  });
}

export function actualizarTramiteAdministrado(idTramite, datos) {
  return solicitarApi(`/administracion/solicitudes/catalogo/${idTramite}`, {
    method: "PUT",
    body: JSON.stringify(datos),
    descripcionOperacion: `guardar los cambios del trámite hijo #${idTramite}`,
  });
}

export function actualizarPortadaTramite(idTramite, archivo) {
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/administracion/solicitudes/catalogo/${idTramite}/portada`, {
    method: "POST",
    body: formulario,
    descripcionOperacion: `cargar la portada del trámite hijo #${idTramite}`,
  });
}
