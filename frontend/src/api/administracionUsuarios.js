import { solicitarApi } from "./clienteHttp";
import { prepararCsrf } from "./autenticacion";

export function listarUsuarios(busqueda = "", pagina = 0) {
  const parametros = new URLSearchParams({ busqueda, pagina: String(pagina), tamano: "20" });
  return solicitarApi(`/administracion/usuarios?${parametros}`);
}

export function listarRoles() {
  return solicitarApi("/administracion/roles");
}

export function listarPermisos() {
  return solicitarApi("/administracion/permisos");
}

export async function crearRol(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/roles", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function crearEmpleado(datos) {
  await prepararCsrf();
  return solicitarApi("/administracion/empleados", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarRolesUsuario(idUsuario, codigosRoles, versionUsuario) {
  await prepararCsrf();
  return solicitarApi(`/administracion/usuarios/${idUsuario}/roles`, {
    method: "PUT",
    body: JSON.stringify({ codigosRoles, versionUsuario }),
  });
}
