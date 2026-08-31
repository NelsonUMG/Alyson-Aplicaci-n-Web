import { useEffect, useState } from "react";
import {
  ErrorApi,
  obtenerEstadoConexionApi,
  solicitarApi,
} from "../api/clienteHttp";
import { diagnosticarError } from "../utilidades/diagnosticoErrores";

function normalizarErrorInesperado(error) {
  if (error instanceof ErrorApi) {
    return {
      mensaje: error.message,
      codigoSoporte: error.codigoSoporte || "ERR-APP-000",
      tipoError: error.tipoError || "Fallo de aplicación",
      detalleSoporte: error.detalleSoporte || "Una operación asíncrona no pudo completarse.",
      referencia: error.idCorrelacion || "",
    };
  }
  const diagnostico = diagnosticarError();
  return {
    mensaje: "Una operación inesperada no pudo completarse. Puedes continuar o recargar la página.",
    codigoSoporte: diagnostico.codigoSoporte,
    tipoError: diagnostico.tipo,
    detalleSoporte: "El navegador detectó una promesa rechazada sin manejo. Revisar el registro del frontend sin exponer la causa al usuario.",
    referencia: "",
  };
}

export function AvisosSistema({ children }) {
  const [conexion, establecerConexion] = useState(obtenerEstadoConexionApi);
  const [comprobando, establecerComprobando] = useState(false);
  const [errorInesperado, establecerErrorInesperado] = useState(null);

  useEffect(() => {
    const actualizarConexion = (evento) => establecerConexion(evento.detail);
    const manejarPromesaNoControlada = (evento) => establecerErrorInesperado(normalizarErrorInesperado(evento.reason));
    const manejarErrorOperacion = (evento) => establecerErrorInesperado(normalizarErrorInesperado(evento.detail));
    window.addEventListener("estadoconexionapi", actualizarConexion);
    window.addEventListener("erroroperacionapi", manejarErrorOperacion);
    window.addEventListener("unhandledrejection", manejarPromesaNoControlada);
    return () => {
      window.removeEventListener("estadoconexionapi", actualizarConexion);
      window.removeEventListener("erroroperacionapi", manejarErrorOperacion);
      window.removeEventListener("unhandledrejection", manejarPromesaNoControlada);
    };
  }, []);

  async function comprobarConexion() {
    establecerComprobando(true);
    try {
      await solicitarApi("/sistema/estado", { tiempoEsperaMs: 5000 });
    } catch {
      // El cliente HTTP publica el estado y el mensaje normalizado de este intento.
    } finally {
      establecerComprobando(false);
    }
  }

  return (
    <>
      {!conexion.disponible && (
        <section className="aviso-sistema aviso-sistema-conexion" role="alert" aria-live="assertive">
          <span aria-hidden="true">!</span>
          <div>
            <strong>{conexion.tipoError || "Servicio temporalmente no disponible"}</strong>
            <p>{conexion.mensaje}</p>
            <details className="detalle-aviso-soporte">
              <summary>Información para soporte</summary>
              <p><b>{conexion.codigoSoporte}</b>{conexion.referencia ? ` · ${conexion.referencia}` : ""}</p>
              <p>{conexion.detalleSoporte}</p>
            </details>
          </div>
          <button type="button" onClick={comprobarConexion} disabled={comprobando}>
            {comprobando ? "Comprobando…" : "Reintentar conexión"}
          </button>
        </section>
      )}
      {errorInesperado && (
        <section className="aviso-sistema aviso-sistema-inesperado" role="alert">
          <span aria-hidden="true">!</span>
          <div>
            <strong>{errorInesperado.tipoError}</strong>
            <p>{errorInesperado.mensaje}</p>
            <details className="detalle-aviso-soporte">
              <summary>Información para soporte</summary>
              <p><b>{errorInesperado.codigoSoporte}</b>{errorInesperado.referencia ? ` · ${errorInesperado.referencia}` : ""}</p>
              <p>{errorInesperado.detalleSoporte}</p>
            </details>
          </div>
          <button type="button" onClick={() => establecerErrorInesperado(null)}>Cerrar</button>
        </section>
      )}
      {children}
    </>
  );
}
