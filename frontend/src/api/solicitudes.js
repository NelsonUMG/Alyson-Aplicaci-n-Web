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

export function guardarResenaTramite(codigo, datos) {
  return solicitarApi(`/solicitudes/tramites/${encodeURIComponent(codigo)}/resena`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function iniciarBorradorTramite(codigo, datos) {
  return solicitarApi(`/solicitudes/tramites/${encodeURIComponent(codigo)}/borradores`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function enviarDenunciaQueja(datos) {
  return solicitarApi("/solicitudes/denuncias-quejas", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function crearBorradorUsoInstalacion(datos) {
  return solicitarApi("/solicitudes/uso-instalacion/borradores", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function actualizarBorradorUsoInstalacion(idSolicitud, datos) {
  return solicitarApi(`/solicitudes/${idSolicitud}/borrador`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function consultarSolicitud(idSolicitud) {
  return solicitarApi(`/solicitudes/${idSolicitud}`);
}

export function agregarDocumentoSolicitud(idSolicitud, archivo) {
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi(`/solicitudes/${idSolicitud}/documentos`, {
    method: "POST",
    body: formulario,
  });
}

export function eliminarDocumentoSolicitud(idSolicitud, idDocumentoSolicitud) {
  return solicitarApi(`/solicitudes/${idSolicitud}/documentos/${idDocumentoSolicitud}`, {
    method: "DELETE",
  });
}

export function eliminarBorradorSolicitud(idSolicitud) {
  return solicitarApi(`/solicitudes/${idSolicitud}`, {
    method: "DELETE",
  });
}

export function enviarSolicitud(idSolicitud, version) {
  return solicitarApi(`/solicitudes/${idSolicitud}/enviar`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}
