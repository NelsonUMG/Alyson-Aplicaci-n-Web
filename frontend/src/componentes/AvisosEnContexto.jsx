import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import "../estilos/avisosEnContexto.css";

const ContextoAvisos = createContext(null);

export function ProveedorAvisosEnContexto({ children }) {
  const [destino, setDestino] = useState(null);
  function ubicar(evento) {
    if (evento.target.closest?.("[data-aviso-contextual], .entrada-contrasena-visible")) return;
    const control = evento.target.closest?.("button");
    const lugar = evento.type === "submit" ? evento.target : control?.closest("form") || control?.parentElement;
    if (lugar && !["TABLE", "TBODY", "THEAD", "TR", "SELECT", "UL", "OL"].includes(lugar.tagName)) setDestino(lugar);
  }
  const destinoFormulario = destino?.closest("form") || destino;
  return <ContextoAvisos.Provider value={destinoFormulario}>
    <div style={{ display: "contents" }} onSubmitCapture={ubicar} onClickCapture={ubicar}>{children}</div>
  </ContextoAvisos.Provider>;
}

export function AvisoEnContexto({ children, className = "", role = "status" }) {
  const destino = useContext(ContextoAvisos);
  const [cerrado, setCerrado] = useState(null);
  if (cerrado === children) return null;
  const aviso = <div data-aviso-contextual className={`aviso-en-contexto ${className}`}>
    <span role={role}>{children}</span>
    <button type="button" aria-label="Cerrar aviso" onClick={() => setCerrado(children)}>×</button>
  </div>;
  return destino?.isConnected ? createPortal(aviso, destino) : aviso;
}
