import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Aplicacion } from "./aplicacion/Aplicacion";
import { crearEnrutadorAplicacion } from "./aplicacion/rutas";
import "./estilos/global.css";
import "./estilos/portal.css";
import "./estilos/ajustesPortal.css";
import "./estilos/ventanilla.css";
import "./estilos/detalleEvento.css";
import "./estilos/administracion.css";
import "./estilos/perfilAdministracion.css";
import "./estilos/configuracionPortada.css";

const elementoRaiz = document.getElementById("root");

if (!elementoRaiz) {
  throw new Error("No se encontró el elemento raíz de la aplicación.");
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <Aplicacion enrutador={crearEnrutadorAplicacion()} />
  </StrictMode>,
);
