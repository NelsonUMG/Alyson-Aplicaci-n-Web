import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { PaginaEstado } from "./PaginaEstado";
import { diagnosticarError } from "../utilidades/diagnosticoErrores";

export function PaginaErrorRuta() {
  const error = useRouteError();
  const esRespuesta = isRouteErrorResponse(error);
  const estado = esRespuesta ? error.status : 500;
  const noEncontrado = estado === 404;
  const referencia = error?.data?.idCorrelacion || error?.idCorrelacion;
  const diagnostico = diagnosticarError({ estado, codigo: error?.data?.codigo || error?.codigo });

  return (
    <PaginaEstado
      codigo={String(estado)}
      titulo={diagnostico.titulo}
      mensaje={diagnostico.mensajeUsuario}
      referencia={referencia}
      codigoSoporte={diagnostico.codigoSoporte}
      tipoError={diagnostico.tipo}
      detalleSoporte={diagnostico.detalleSoporte}
      textoAccion="Recargar página"
      alAccion={noEncontrado ? undefined : () => window.location.reload()}
    />
  );
}
