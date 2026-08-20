export function esUsuarioComun(usuario) {
  const roles = usuario?.roles ?? [];
  return roles.length === 1 && roles.includes("USUARIOREGISTRADO");
}
