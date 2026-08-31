import { createBrowserRouter, Navigate } from "react-router-dom";
import { RutaProtegida } from "../autenticacion/RutaProtegida";
import { EstructuraPortal } from "../componentes/EstructuraPortal";
import { EstructuraAdministracion } from "../componentes/EstructuraAdministracion";
import { MODULO_BICICLETAS_VISIBLE } from "../configuracion/modulos";
import { PaginaAdministracionUsuarios } from "../paginas/PaginaAdministracionUsuarios";
import { PaginaAdministracionPublicaciones } from "../paginas/PaginaAdministracionPublicaciones";
import { PaginaAdministracionEventos } from "../paginas/PaginaAdministracionEventos";
import { PaginaAdministracionAreas } from "../paginas/PaginaAdministracionAreas";
import { PaginaAdministracionBicicletas } from "../paginas/PaginaAdministracionBicicletas";
import { PaginaAdministracionInstitucional } from "../paginas/PaginaAdministracionInstitucional";
import { PaginaAdministracionSolicitudes } from "../paginas/PaginaAdministracionSolicitudes";
import { PaginaAreasServicios } from "../paginas/PaginaAreasServicios";
import { PaginaAuditoria } from "../paginas/PaginaAuditoria";
import { PaginaBase } from "../paginas/PaginaBase";
import { PaginaBicicletas } from "../paginas/PaginaBicicletas";
import { PaginaDetalleEvento } from "../paginas/PaginaDetalleEvento";
import { PaginaDetallePublicacion } from "../paginas/PaginaDetallePublicacion";
import { PaginaEstado } from "../paginas/PaginaEstado";
import { PaginaErrorRuta } from "../paginas/PaginaErrorRuta";
import { PaginaEventos } from "../paginas/PaginaEventos";
import { PaginaInicioSesion } from "../paginas/PaginaInicioSesion";
import { PaginaMapa } from "../paginas/PaginaMapa";
import { PaginaMisInscripciones } from "../paginas/PaginaMisInscripciones";
import { PaginaMisSolicitudes } from "../paginas/PaginaMisSolicitudes";
import { PaginaNoticias } from "../paginas/PaginaNoticias";
import { PaginaNosotros } from "../paginas/PaginaNosotros";
import { PaginaPerfil } from "../paginas/PaginaPerfil";
import { PaginaRegistro } from "../paginas/PaginaRegistro";
import { PaginaReportesInscripciones } from "../paginas/PaginaReportesInscripciones";
import { PaginaVerificacionCorreo } from "../paginas/PaginaVerificacionCorreo";

const rutasSinManejador = [
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
        path: "/noticias/:identificadorUrl",
        element: <PaginaDetallePublicacion />,
      },
      {
        path: "/eventos",
        element: <PaginaEventos />,
      },
      {
        path: "/eventos/:identificadorUrl",
        element: <PaginaDetalleEvento />,
      },
      {
        path: "/mapa",
        element: <PaginaMapa />,
      },
      {
        path: "/bicicletas",
        element: MODULO_BICICLETAS_VISIBLE ? <PaginaBicicletas /> : <Navigate to="/" replace />,
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
    path: "/verificar-correo",
    element: <PaginaVerificacionCorreo />,
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
    path: "/mis-inscripciones",
    element: (
      <RutaProtegida>
        <PaginaMisInscripciones />
      </RutaProtegida>
    ),
  },
  {
    path: "/mis-solicitudes",
    element: (
      <RutaProtegida>
        <PaginaMisSolicitudes />
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/solicitudes",
    element: (
      <RutaProtegida permiso="SOLICITUDGESTIONAR">
        <EstructuraAdministracion><PaginaAdministracionSolicitudes /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/reportes/inscripciones",
    element: (
      <RutaProtegida permiso="REPORTELEER">
        <EstructuraAdministracion><PaginaReportesInscripciones /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/auditoria",
    element: (
      <RutaProtegida permiso="REPORTELEER">
        <EstructuraAdministracion><PaginaAuditoria /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/areas",
    element: (
      <RutaProtegida permiso="AREALEER">
        <EstructuraAdministracion><PaginaAdministracionAreas /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/bicicletas",
    element: MODULO_BICICLETAS_VISIBLE ? (
      <RutaProtegida permiso="BICICLETALEER">
        <EstructuraAdministracion><PaginaAdministracionBicicletas /></EstructuraAdministracion>
      </RutaProtegida>
    ) : <Navigate to="/perfil" replace />,
  },
  {
    path: "/administracion/eventos",
    element: (
      <RutaProtegida permiso="EVENTOLEER">
        <EstructuraAdministracion><PaginaAdministracionEventos /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/publicaciones",
    element: (
      <RutaProtegida permiso="PUBLICACIONLEER">
        <EstructuraAdministracion><PaginaAdministracionPublicaciones /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/institucional",
    element: (
      <RutaProtegida permiso="INSTITUCIONALGESTIONAR">
        <EstructuraAdministracion><PaginaAdministracionInstitucional /></EstructuraAdministracion>
      </RutaProtegida>
    ),
  },
  {
    path: "/administracion/usuarios",
    element: (
      <RutaProtegida permiso="ROLGESTIONAR">
        <EstructuraAdministracion><PaginaAdministracionUsuarios /></EstructuraAdministracion>
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
        codigo="500"
        textoAccion="Recargar página"
        alAccion={() => window.location.reload()}
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

export const rutasAplicacion = rutasSinManejador.map((ruta) => ({
  ...ruta,
  errorElement: <PaginaErrorRuta />,
}));

export function crearEnrutadorAplicacion() {
  return createBrowserRouter(rutasAplicacion);
}
