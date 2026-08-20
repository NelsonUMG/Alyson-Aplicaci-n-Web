import { Navigate, useLocation } from "react-router-dom";
import { usarSesion } from "./ContextoSesion";
import { esUsuarioComun } from "./clasificacionUsuario";

export function RutaProtegida({ children, permiso }) {
  const { cargando, usuario } = usarSesion();
  const ubicacion = useLocation();

  if (cargando) {
    return <p className="estado-carga" role="status">Comprobando la sesión…</p>;
  }
  if (!usuario) {
    return <Navigate to="/iniciar-sesion" state={{ desde: ubicacion.pathname }} replace />;
  }
  if (ubicacion.pathname.startsWith("/administracion/") && esUsuarioComun(usuario)) {
    return <Navigate to="/403" replace />;
  }
  if (permiso && !usuario.permisos.includes(permiso)) {
    return <Navigate to="/403" replace />;
  }
  return children;
}
