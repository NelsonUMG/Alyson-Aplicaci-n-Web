import { formatearTextoEditorial } from "../utilidades/formatoTexto";

export function CabeceraPagina({ etiqueta, titulo, descripcion }) {
  return (
    <header className="pagina-publica-cabecera">
      <div className="portal-contenedor">
        <p className="portal-sobrelinea">{formatearTextoEditorial(etiqueta)}</p>
        <h1>{formatearTextoEditorial(titulo)}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
    </header>
  );
}
