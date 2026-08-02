import { solicitarApi } from "./clienteHttp";
import { prepararCsrf } from "./autenticacion";

export function listarUsuarios(busqueda = "", pagina = 0) {
  const parametros = new URLSearchParams({ busqueda, pagina: String(pagina), tamano: "20" });
  return solicitarApi(`/administracion/usuarios?${parametros}`);
}

export function listarRoles() {
  return solicitarApi("/administracion/roles");
}

export async function actualizarRolesUsuario(idUsuario, codigosRoles, versionUsuario) {
  await prepararCsrf();
  return solicitarApi(`/administracion/usuarios/${idUsuario}/roles`, {
    method: "PUT",
    body: JSON.stringify({ codigosRoles, versionUsuario }),
  });
}
