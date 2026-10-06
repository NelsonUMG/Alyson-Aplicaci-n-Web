import { createContext, useContext, useEffect, useState } from "react";
import { consultarPortada } from "../api/configuracionPortada";

export const portadaInicial = { colorPrincipal: "#0b4536", portadaUrl: null, version: 0 };
export function textoSobreColor(color) {
  const [r, g, b] = color.slice(1).match(/../g).map((valor) => {
    const canal = parseInt(valor, 16) / 255;
    return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#000000" : "#ffffff";
}
const ContextoPortada = createContext({ configuracion: portadaInicial });
export function usarPortada() { return useContext(ContextoPortada); }
export function ProveedorPortada({ children }) {
  const [configuracion, actualizarConfiguracion] = useState(portadaInicial);
  useEffect(() => {
    let vigente = true;
    async function actualizar() {
      if (document.visibilityState === "hidden") return;
      try {
        const respuesta = await consultarPortada();
        if (vigente) actualizarConfiguracion(respuesta);
      } catch { /* Se mantiene la última configuración disponible. */ }
    }
    actualizar();
    const intervalo = window.setInterval(actualizar, 15000);
    window.addEventListener("focus", actualizar);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizar);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, []);
  return <ContextoPortada.Provider value={{ configuracion, actualizarConfiguracion }}>{children}</ContextoPortada.Provider>;
}
