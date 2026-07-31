import { RouterProvider } from "react-router-dom";
import { LimiteErrores } from "../componentes/LimiteErrores";

export function Aplicacion({ enrutador }) {
  return (
    <LimiteErrores>
      <RouterProvider router={enrutador} />
    </LimiteErrores>
  );
}
