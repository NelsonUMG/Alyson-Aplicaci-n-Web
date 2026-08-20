import { useEffect, useState } from "react";
import { listarAreas } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";
import { formatearTextoEditorial, formatearTextoTecnico } from "../utilidades/formatoTexto";

const espacios = ["Áreas deportivas", "Espacios recreativos", "Servicios al visitante"];

export function PaginaAreasServicios() {
  const [areas, establecerAreas] = useState([]);
  const [error, establecerError] = useState("");
  const [cargando, establecerCargando] = useState(true);

  useEffect(() => {
    let paginaVigente = true;
    listarAreas()
      .then((datos) => {
        if (paginaVigente) {
          establecerAreas(datos);
          establecerCargando(false);
        }
      })
      .catch(() => {
        if (paginaVigente) {
          establecerError("No fue posible cargar las áreas y servicios.");
          establecerCargando(false);
        }
      });
    return () => {
      paginaVigente = false;
    };
  }, []);

  return (
    <>
      <CabeceraPagina
        etiqueta="Planifica tu visita"
        titulo="Áreas y servicios"
        descripcion="Consulta los espacios y servicios disponibles dentro del parque."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor">
          {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          {cargando && <p className="portal-estado-carga" role="status">Cargando áreas y servicios…</p>}
          {!cargando && areas.length > 0 ? (
            <div className="pagina-rejilla-tarjetas">
              {areas.map((area, indice) => (
                <article className="pagina-tarjeta" key={area.codigo}>
                  {area.urlImagen && <img className="pagina-tarjeta-imagen" src={area.urlImagen} alt={area.nombre} />}
                  <span className="pagina-tarjeta-numero">{String(indice + 1).padStart(2, "0")}</span>
                  <p className="portal-sobrelinea">{area.nombreCategoria}</p>
                  <h2>{formatearTextoEditorial(area.nombre)}</h2>
                  <p>{area.descripcion || "Información pendiente de actualización"}</p>
                  {area.notaDisponibilidad && <p>{area.notaDisponibilidad}</p>}
                  <span className="pagina-estado-dato">{formatearTextoTecnico(area.estado)}</span>
                </article>
              ))}
            </div>
          ) : !cargando && (
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
          )}
        </div>
      </section>
    </>
  );
}
