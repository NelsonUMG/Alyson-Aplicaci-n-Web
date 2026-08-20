import { solicitarApi } from "./clienteHttp";

export function listarSolicitudesAdministradas({ busqueda = "", estado = "", pagina = 0, tamano = 20 } = {}) {
  const parametros = new URLSearchParams({ busqueda, estado, pagina: String(pagina), tamano: String(tamano) });
  return solicitarApi(`/administracion/solicitudes?${parametros}`);
}

export function consultarSolicitudAdministrada(idSolicitud) {
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}`);
}

export function iniciarRevisionSolicitud(idSolicitud, version) {
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}/iniciar-revision`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

export function resolverSolicitud(idSolicitud, decision, respuesta, version) {
  return solicitarApi(`/administracion/solicitudes/${idSolicitud}/resolver`, {
    method: "POST",
    body: JSON.stringify({ decision, respuesta, version }),
  });
}
