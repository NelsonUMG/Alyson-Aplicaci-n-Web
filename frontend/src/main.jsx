import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Aplicacion } from "./aplicacion/Aplicacion";
import { crearEnrutadorAplicacion } from "./aplicacion/rutas";
import "./estilos/global.css";
import "./estilos/portal.css";

const elementoRaiz = document.getElementById("root");

if (!elementoRaiz) {
  throw new Error("No se encontró el elemento raíz de la aplicación.");
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <Aplicacion enrutador={crearEnrutadorAplicacion()} />
  </StrictMode>,
);
