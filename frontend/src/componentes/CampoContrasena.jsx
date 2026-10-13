import { useState } from "react";
import "../estilos/campoContrasena.css";

export function CampoContrasena(props) {
  const [visible, setVisible] = useState(false);
  return <div className="entrada-contrasena-visible">
    <input {...props} type={visible ? "text" : "password"} />
    <button type="button" className="alternar-contrasena" aria-controls={props.id}
      aria-label={`${visible ? "Ocultar" : "Mostrar"} contraseña (${props.id})`}
      aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(!visible)}>
      {visible ? "Ocultar" : "Mostrar"}
    </button>
  </div>;
}
