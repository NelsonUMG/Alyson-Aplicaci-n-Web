import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usarSesion } from "../autenticacion/ContextoSesion";

export function EstructuraAdministracion({ children }) {
  const { usuario, cerrar } = usarSesion();
  const navegacion = useNavigate();
  const [cerrando, establecerCerrando] = useState(false);

  async function cerrarSesion() {
    establecerCerrando(true);
    try {
      await cerrar();
      navegacion("/iniciar-sesion", { replace: true });
    } catch {
      establecerCerrando(false);
    }
  }

  const etiquetaUsuario = usuario?.roles?.includes("ADMINISTRADOR")
    ? "Administrador"
    : usuario?.nombre || "Usuario";

  return (
    <div className="estructura-administracion">
      <header className="barra-superior-administracion">
        <div className="contenido-barra-superior-administracion">
          <Link className="marca-barra-administracion" to="/perfil">Parque Erick Barrondo</Link>
          <nav className="sesion-barra-administracion" aria-label="Sesión administrativa">
            <span>{etiquetaUsuario}</span>
            <button type="button" disabled={cerrando} onClick={cerrarSesion}>
              {cerrando ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
