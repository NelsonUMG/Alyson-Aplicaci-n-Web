import { RouterProvider } from "react-router-dom";
import { AvisosSistema } from "../componentes/AvisosSistema";
import { LimiteErrores } from "../componentes/LimiteErrores";
import { ProveedorSesion } from "../autenticacion/ContextoSesion";

export function Aplicacion({ enrutador }) {
  return (
    <LimiteErrores>
      <AvisosSistema>
        <ProveedorSesion>
          <RouterProvider router={enrutador} />
        </ProveedorSesion>
      </AvisosSistema>
    </LimiteErrores>
  );
}
