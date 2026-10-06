import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

export function consultarPortada() {
  return solicitarApi("/publico/apariencia", { cache: "no-store" });
}
export async function guardarPortada(configuracion, imagen) {
  await prepararCsrf();
  const cuerpo = new window.FormData();
  cuerpo.append("configuracion", new window.Blob([JSON.stringify(configuracion)], { type: "application/json" }));
  if (imagen) cuerpo.append("imagen", imagen);
  return solicitarApi("/administracion/apariencia", { method: "PUT", body: cuerpo });
}
