import { useRef } from "react";
import "../estilos/fotografiaParticipante.css";

export function FotografiaParticipante({ src, nombre = "participante" }) {
  const dialogo = useRef(null);
  return <span className="fotografia-participante">
    <img className="fotografia-miniatura" src={src} alt={`Fotografía de ${nombre}`} />
    <button type="button" onClick={() => dialogo.current.showModal()}>Ver fotografía</button>
    <dialog ref={dialogo} className="dialogo-fotografia" aria-label={`Fotografía de ${nombre}`} onClick={(evento) => { if (evento.target === evento.currentTarget) dialogo.current.close(); }}>
      <div className="cabecera-fotografia"><strong>Fotografía de {nombre}</strong><button type="button" onClick={() => dialogo.current.close()}>Cerrar</button></div>
      <img src={src} alt={`Fotografía ampliada de ${nombre}`} />
    </dialog>
  </span>;
}
