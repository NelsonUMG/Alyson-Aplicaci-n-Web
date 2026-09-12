export function CabeceraAdministracion({ titulo, descripcion }) {
  return (
    <header className="cabecera-modulo-administracion">
      <h1>{titulo}</h1>
      {descripcion && <p>{descripcion}</p>}
    </header>
  );
}
