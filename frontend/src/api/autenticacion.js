import { recordarTokenCsrf, solicitarApi } from "./clienteHttp";

export async function solicitarRecuperacion(correo) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/recuperar-contrasena", { method: "POST", body: JSON.stringify({ correo }) });
}

export async function restablecerContrasena(datos) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/restablecer-contrasena", { method: "POST", body: JSON.stringify(datos) });
}

export async function prepararCsrf() {
  let respuesta;
  try {
    respuesta = await solicitarApi("/autenticacion/csrf");
  } catch (error) {
    if (error.estado !== 401) throw error;
    // La primera petición elimina una sesión revocada al recuperar la contraseña.
    respuesta = await solicitarApi("/autenticacion/csrf");
  }
  recordarTokenCsrf(respuesta.token);
  return respuesta;
}

export async function registrarCuenta(datos) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/registro", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function confirmarCorreo(token) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/confirmar-correo", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function reenviarVerificacion(correo) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/reenviar-verificacion", {
    method: "POST",
    body: JSON.stringify({ correo }),
  });
}

export async function iniciarSesion(datos) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/iniciar-sesion", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerPerfil() {
  return solicitarApi("/autenticacion/perfil");
}

export async function actualizarPerfil(datos) {
  await prepararCsrf();
  const datosEditables = {
    nombre: datos.nombre,
    apellido: datos.apellido,
    dpiExtendidoEn: datos.dpiExtendidoEn,
    fechaNacimiento: datos.fechaNacimiento,
    celular: datos.celular,
    telefono: datos.telefono,
    direccion: datos.direccion,
  };
  return solicitarApi("/autenticacion/perfil", {
    method: "PUT",
    body: JSON.stringify(datosEditables),
  });
}

export async function subirFotoPerfil(archivo) {
  await prepararCsrf();
  const formulario = new window.FormData();
  formulario.append("archivo", archivo);
  return solicitarApi("/autenticacion/perfil/foto", {
    method: "POST",
    body: formulario,
  });
}

export async function eliminarFotoPerfil() {
  await prepararCsrf();
  return solicitarApi("/autenticacion/perfil/foto", { method: "DELETE" });
}

export async function cerrarSesion() {
  await prepararCsrf();
  return solicitarApi("/autenticacion/cerrar-sesion", { method: "POST" });
}

export async function cambiarContrasena(datos) {
  await prepararCsrf();
  return solicitarApi("/autenticacion/contrasena", {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}
