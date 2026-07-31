export function PaginaBase() {
  return (
    <div className="envoltura-sitio">
      <header className="encabezado-sitio">
        <span className="marca-sitio" aria-hidden="true">PEB</span>
        <span>Parque Erick Barrondo</span>
      </header>
      <main className="pagina-base">
        <p className="etiqueta-fase">Base técnica · Fase 2</p>
        <h1>Sistema web en preparación</h1>
        <p className="introduccion">
          La estructura de React, la API Java y las migraciones de SQL Server ya tienen un punto de
          partida verificable. El contenido institucional se incorporará en las fases siguientes.
        </p>
        <dl className="base-sistema" aria-label="Componentes de la base técnica">
          <div>
            <dt>Interfaz</dt>
            <dd>React y JavaScript</dd>
          </div>
          <div>
            <dt>Servicios</dt>
            <dd>Java y Spring Boot</dd>
          </div>
          <div>
            <dt>Datos</dt>
            <dd>Microsoft SQL Server</dd>
          </div>
        </dl>
      </main>
      <footer className="pie-sitio">Sistema institucional en desarrollo</footer>
    </div>
  );
}
