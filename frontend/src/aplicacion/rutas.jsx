import { createBrowserRouter } from "react-router-dom";
import { PaginaBase } from "../paginas/PaginaBase";
import { PaginaEstado } from "../paginas/PaginaEstado";

export const rutasAplicacion = [
  {
    path: "/",
    element: <PaginaBase />,
  },
  {
    path: "/403",
    element: (
      <PaginaEstado
        codigo="403"
        titulo="Acceso no autorizado"
        mensaje="No tienes permiso para consultar este recurso."
      />
    ),
  },
  {
    path: "/error",
    element: (
      <PaginaEstado
        codigo="Error"
        titulo="No fue posible completar la solicitud"
        mensaje="Intenta nuevamente. Si el problema continúa, comunícalo al personal responsable."
      />
    ),
  },
  {
    path: "*",
    element: (
      <PaginaEstado
        codigo="404"
        titulo="Página no encontrada"
        mensaje="La dirección solicitada no corresponde a una página disponible."
      />
    ),
  },
];

export function crearEnrutadorAplicacion() {
  return createBrowserRouter(rutasAplicacion);
}
