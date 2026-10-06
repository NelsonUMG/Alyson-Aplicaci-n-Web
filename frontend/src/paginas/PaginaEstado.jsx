import { Link } from "react-router-dom";
import { diagnosticarError } from "../utilidades/diagnosticoErrores";

export function PaginaEstado({ codigo, titulo, mensaje, textoAccion, alAccion, codigoSoporte }) {
  const diagnostico = diagnosticarError({ estado: codigo, codigo: codigoSoporte });
  return (
    <main className="pagina-estado">
      <p className="codigo-estado" aria-label={`Error ${codigo}`}>{codigo}</p>
      <h1>{titulo || diagnostico.titulo}</h1>
      <p>{mensaje || diagnostico.mensajeUsuario}</p>
      <div className="acciones-pagina-estado">
        {alAccion && (
          <button className="enlace-principal" type="button" onClick={alAccion}>
            {textoAccion || "Intentar nuevamente"}
          </button>
        )}
        <Link className={alAccion ? "enlace-secundario" : "enlace-principal"} to="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
