import { Navigate, useLocation } from "react-router-dom";
import { usarSesion } from "./ContextoSesion";
import { esUsuarioComun } from "./clasificacionUsuario";
import { PaginaEstado } from "../paginas/PaginaEstado";

export function RutaProtegida({ children, permiso }) {
  const { cargando, usuario, error } = usarSesion();
  const ubicacion = useLocation();

  if (cargando) {
    return <p className="estado-carga" role="status">Comprobando la sesión…</p>;
  }
  if (error) {
    return (
      <PaginaEstado
        codigo="503"
        titulo="No pudimos comprobar tu sesión"
        mensaje={error}
        textoAccion="Reintentar"
        alAccion={() => window.location.reload()}
      />
    );
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
