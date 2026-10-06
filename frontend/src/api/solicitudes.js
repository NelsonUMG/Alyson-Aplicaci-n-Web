import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

export function listarMisSolicitudes({ grupo = "TODOS", pagina = 0, tamano = 10 } = {}) {
  const parametros = new URLSearchParams({
    grupo,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return solicitarApi(`/solicitudes/mias?${parametros}`);
}

export function consultarProcedimientoUsoInstalacion() {
  return solicitarApi("/solicitudes/procedimientos/uso-instalacion");
}

export function listarCatalogoTramites() {
  return solicitarApi("/solicitudes/catalogo");
}

export function consultarTramite(codigo) {
  return solicitarApi(`/solicitudes/tramites/${encodeURIComponent(codigo)}`);
}

export async function guardarResenaTramite(codigo, datos) {
  await prepararCsrf();
  return solicitarApi(`/solicitudes/tramites/${encodeURIComponent(codigo)}/resena`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function iniciarBorradorTramite(codigo, datos) {
  await prepararCsrf();
  return solicitarApi(`/solicitudes/tramites/${encodeURIComponent(codigo)}/borradores`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function enviarDenunciaQueja(datos) {
  await prepararCsrf();
  return solicitarApi("/solicitudes/denuncias-quejas", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function crearBorradorUsoInstalacion(datos) {
  await prepararCsrf();
  return solicitarApi("/solicitudes/uso-instalacion/borradores", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarBorradorUsoInstalacion(idSolicitud, datos) {
  await prepararCsrf();
  return solicitarApi(`/solicitudes/${idSolicitud}/borrador`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function consultarSolicitud(idSolicitud) {
  return solicitarApi(`/solicitudes/${idSolicitud}`);
}

export async function agregarDocumentoSolicitud(idSolicitud, archivo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/solicitudes/${idSolicitud}/documentos`, {
    method: "POST",
    body: formulario,
  });
}

export async function eliminarDocumentoSolicitud(idSolicitud, idDocumentoSolicitud) {
  await prepararCsrf();
  return solicitarApi(`/solicitudes/${idSolicitud}/documentos/${idDocumentoSolicitud}`, {
    method: "DELETE",
  });
}

export async function eliminarBorradorSolicitud(idSolicitud) {
  await prepararCsrf();
  return solicitarApi(`/solicitudes/${idSolicitud}`, {
    method: "DELETE",
  });
}

export async function enviarSolicitud(idSolicitud, version) {
  await prepararCsrf();
  return solicitarApi(`/solicitudes/${idSolicitud}/enviar`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}
