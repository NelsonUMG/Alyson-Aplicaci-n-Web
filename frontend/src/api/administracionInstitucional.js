import { prepararCsrf } from "./autenticacion";
import { solicitarApi } from "./clienteHttp";

export function consultarContenidoInstitucionalAdministrado() {
  return solicitarApi("/administracion/institucional");
}

export async function actualizarContenidoInstitucional(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/institucional", {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}
