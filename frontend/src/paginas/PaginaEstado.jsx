import { Link } from "react-router-dom";

export function PaginaEstado({ codigo, titulo, mensaje }) {
  return (
    <main className="pagina-estado">
      <p className="codigo-estado" aria-hidden="true">{codigo}</p>
      <h1>{titulo}</h1>
      <p>{mensaje}</p>
      <Link className="enlace-principal" to="/">Volver al inicio</Link>
    </main>
  );
}
