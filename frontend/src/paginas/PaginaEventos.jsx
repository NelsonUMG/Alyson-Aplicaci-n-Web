import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarEventos } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

export function PaginaEventos() {
  const [respuesta, establecerRespuesta] = useState(null);
  const [pagina, establecerPagina] = useState(0);
  const [error, establecerError] = useState("");
  const [cargando, establecerCargando] = useState(true);

  useEffect(() => {
    let paginaVigente = true;
    establecerError("");
    establecerCargando(true);
    listarEventos({ pagina, tamano: 10 })
      .then((datos) => {
        if (paginaVigente) {
          establecerRespuesta(datos);
          establecerCargando(false);
        }
      })
      .catch(() => {
        if (paginaVigente) {
          establecerRespuesta(null);
          establecerError("No fue posible cargar los eventos.");
          establecerCargando(false);
        }
      });
    return () => {
      paginaVigente = false;
    };
  }, [pagina]);

  const eventos = respuesta?.contenido || [];

  return (
    <>
      <CabeceraPagina
        etiqueta="Agenda del parque"
        titulo="Eventos y cursos"
        descripcion="Actividades, requisitos, cupos y periodos de inscripción."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor">
          {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          {cargando && <p className="portal-estado-carga" role="status">Cargando eventos…</p>}

          {!error && !cargando && eventos.length === 0 && (
            <div className="eventos-contenido">
              <div className="eventos-fecha" aria-hidden="true">
                <span>Agenda</span>
                <strong>—</strong>
              </div>
              <div>
                <p className="portal-sobrelinea">Próximas actividades</p>
                <h2>No hay eventos publicados todavía</h2>
                <p>Cuando una actividad sea confirmada podrás consultar aquí su fecha, ubicación, requisitos y cupos.</p>
                <Link className="portal-boton portal-boton-verde" to="/registro">Crear una cuenta</Link>
              </div>
            </div>
          )}

          {eventos.length > 0 && (
            <div className="portal-listado-publico">
              {eventos.map((evento) => (
                <article className="portal-elemento-publico portal-evento-publico" key={evento.identificadorUrl}>
                  {evento.urlImagen && <img className="portal-imagen-evento-listado" src={evento.urlImagen} alt={evento.titulo} loading="lazy" />}
                  <div>
                    <p className="portal-sobrelinea">{evento.estado}</p>
                    <h2><Link to={`/eventos/${evento.identificadorUrl}`}>{evento.titulo}</Link></h2>
                    <p>{evento.descripcion}</p>
                  </div>
                  <dl>
                    <div><dt>Fecha</dt><dd>{formatoFecha.format(new Date(evento.iniciaEn))}</dd></div>
                    <div><dt>Lugar</dt><dd>{evento.lugar || "Información pendiente de actualización"}</dd></div>
                    <div><dt>Cupos disponibles</dt><dd>{evento.cuposDisponibles}</dd></div>
                  </dl>
                  <Link className="portal-enlace-ver" to={`/eventos/${evento.identificadorUrl}`}>Consultar actividad</Link>
                </article>
              ))}
            </div>
          )}

          {respuesta?.totalPaginas > 1 && (
            <nav className="portal-paginacion" aria-label="Paginación de eventos">
              <button type="button" disabled={pagina === 0} onClick={() => establecerPagina(pagina - 1)}>Anterior</button>
              <span>Página {pagina + 1} de {respuesta.totalPaginas}</span>
              <button
                type="button"
                disabled={pagina + 1 >= respuesta.totalPaginas}
                onClick={() => establecerPagina(pagina + 1)}
              >Siguiente</button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
