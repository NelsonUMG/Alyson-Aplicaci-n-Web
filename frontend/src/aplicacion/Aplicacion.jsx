import { RouterProvider } from "react-router-dom";
import { LimiteErrores } from "../componentes/LimiteErrores";
import { ProveedorSesion } from "../autenticacion/ContextoSesion";

export function Aplicacion({ enrutador }) {
  return (
    <LimiteErrores>
      <ProveedorSesion>
        <RouterProvider router={enrutador} />
      </ProveedorSesion>
    </LimiteErrores>
  );
}
