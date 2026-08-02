export function CabeceraPagina({ etiqueta, titulo, descripcion }) {
  return (
    <header className="pagina-publica-cabecera">
      <div className="portal-contenedor">
        <p className="portal-sobrelinea">{etiqueta}</p>
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
    </header>
  );
}
