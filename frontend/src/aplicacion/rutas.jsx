import { createBrowserRouter, Navigate } from "react-router-dom";
import { RutaProtegida } from "../autenticacion/RutaProtegida";
import { EstructuraPortal } from "../componentes/EstructuraPortal";
import { PaginaAdministracionUsuarios } from "../paginas/PaginaAdministracionUsuarios";
import { PaginaAreasServicios } from "../paginas/PaginaAreasServicios";
import { PaginaBase } from "../paginas/PaginaBase";
import { PaginaEstado } from "../paginas/PaginaEstado";
import { PaginaEventos } from "../paginas/PaginaEventos";
import { PaginaInicioSesion } from "../paginas/PaginaInicioSesion";
import { PaginaMapa } from "../paginas/PaginaMapa";
import { PaginaNoticias } from "../paginas/PaginaNoticias";
import { PaginaNosotros } from "../paginas/PaginaNosotros";
import { PaginaPerfil } from "../paginas/PaginaPerfil";
import { PaginaRegistro } from "../paginas/PaginaRegistro";

export const rutasAplicacion = [
  {
    element: <EstructuraPortal />,
    children: [
      {
        path: "/",
        element: <PaginaBase />,
      },
      {
        path: "/nosotros",
        element: <PaginaNosotros />,
      },
      {
        path: "/areas-servicios",
        element: <PaginaAreasServicios />,
      },
      {
        path: "/noticias",
        element: <PaginaNoticias />,
      },
      {
        path: "/eventos",
        element: <PaginaEventos />,
      },
      {
        path: "/mapa",
        element: <PaginaMapa />,
      },
    ],
  },
  {
    path: "/iniciar-sesion",
    element: <PaginaInicioSesion />,
  },
  {
    path: "/registro",
    element: <PaginaRegistro />,
  },
  {
    path: "/perfil",
    element: (
      <RutaProtegida>
        <PaginaPerfil />
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/usuarios",
    element: (
      <RutaProtegida permiso="ROLGESTIONAR">
        <PaginaAdministracionUsuarios />
      </RutaProtegida>
    ),
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
    path: "/sesion-expirada",
    element: <Navigate to="/iniciar-sesion" replace />,
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
