import { RouterProvider } from "react-router-dom";
import { AvisosSistema } from "../componentes/AvisosSistema";
import { LimiteErrores } from "../componentes/LimiteErrores";
import { ProveedorSesion } from "../autenticacion/ContextoSesion";
import { ProveedorPortada } from "../componentes/ContextoPortada";

export function Aplicacion({ enrutador }) {
  return (
    <LimiteErrores>
      <AvisosSistema>
        <ProveedorSesion>
          <ProveedorPortada><RouterProvider router={enrutador} /></ProveedorPortada>
        </ProveedorSesion>
      </AvisosSistema>
    </LimiteErrores>
  );
}
