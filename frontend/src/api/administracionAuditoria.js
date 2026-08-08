import { solicitarApi } from "./clienteHttp";

function convertirFecha(fecha) {
  return fecha ? new Date(fecha).toISOString() : "";
}

export function listarEventosAuditoria({
  accion = "",
  tipoRecurso = "",
  idRecurso = "",
  resultado = "",
  idUsuarioActor = "",
  desde = "",
  hasta = "",
  pagina = 0,
  tamano = 20,
} = {}) {
  const parametros = new URLSearchParams({
    accion,
    tipoRecurso,
    idRecurso,
    resultado,
    desde: convertirFecha(desde),
    hasta: convertirFecha(hasta),
    pagina: String(pagina),
    tamano: String(tamano),
  });
  if (idUsuarioActor) parametros.set("idUsuarioActor", String(idUsuarioActor));
  return solicitarApi(`/administracion/auditoria?${parametros}`);
}
