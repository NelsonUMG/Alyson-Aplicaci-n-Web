import { CabeceraPagina } from "../componentes/CabeceraPagina";

const espacios = ["Áreas deportivas", "Espacios recreativos", "Servicios al visitante"];

export function PaginaAreasServicios() {
  return (
    <>
      <CabeceraPagina
        etiqueta="Planifica tu visita"
        titulo="Áreas y servicios"
        descripcion="Consulta los espacios y servicios disponibles dentro del parque."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor">
          <div className="pagina-rejilla-tarjetas">
            {espacios.map((espacio, indice) => (
              <article className="pagina-tarjeta" key={espacio}>
                <span className="pagina-tarjeta-numero">0{indice + 1}</span>
                <h2>{espacio}</h2>
                <p>La descripción, disponibilidad y condiciones de uso se publicarán cuando sean confirmadas.</p>
                <span className="pagina-estado-dato">Información pendiente</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
