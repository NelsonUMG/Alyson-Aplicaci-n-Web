import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

export function listarNotificaciones() {
  return solicitarApi("/notificaciones");
}

export async function marcarNotificacionLeida(idNotificacion) {
  await prepararCsrf();
  return solicitarApi(`/notificaciones/${idNotificacion}/leida`, { method: "PUT" });
}
