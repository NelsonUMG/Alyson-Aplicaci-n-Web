import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarCategoriasPublicacion, listarPublicaciones } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";
import { formatearTextoEditorial } from "../utilidades/formatoTexto";

const filtrosIniciales = {
  busqueda: "",
  categoria: "",
  fechaDesde: "",
  fechaHasta: "",
};

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "long",
  timeZone: "America/Guatemala",
});

export function PaginaNoticias() {
  const [filtros, establecerFiltros] = useState(filtrosIniciales);
  const [filtrosAplicados, establecerFiltrosAplicados] = useState(filtrosIniciales);
  const [categorias, establecerCategorias] = useState([]);
  const [pagina, establecerPagina] = useState(0);
  const [respuesta, establecerRespuesta] = useState(null);
  const [error, establecerError] = useState("");
  const [cargando, establecerCargando] = useState(true);

  useEffect(() => {
    listarCategoriasPublicacion().then(establecerCategorias).catch(() => undefined);
  }, []);

  useEffect(() => {
    let paginaVigente = true;
    establecerError("");
    establecerCargando(true);
    listarPublicaciones({ ...filtrosAplicados, pagina, tamano: 6 })
      .then((datos) => {
        if (paginaVigente) {
          establecerRespuesta(datos);
          establecerCargando(false);
        }
      })
      .catch(() => {
        if (paginaVigente) {
          establecerRespuesta(null);
          establecerError("No fue posible cargar las noticias.");
          establecerCargando(false);
        }
      });
    return () => {
      paginaVigente = false;
    };
  }, [filtrosAplicados, pagina]);

  function aplicarBusqueda(evento) {
    evento.preventDefault();
    establecerPagina(0);
    establecerFiltrosAplicados({
      ...filtros,
      busqueda: filtros.busqueda.trim(),
    });
  }

  const publicaciones = respuesta?.contenido || [];

  return (
    <>
      <CabeceraPagina
        etiqueta="Actualidad"
        titulo="Noticias"
        descripcion="Avisos y publicaciones oficiales del Parque Erick Barrondo."
      />
      <section className="portal-seccion portal-seccion-noticias-herramientas">
        <div className="portal-contenedor">
          <form className="portal-filtros portal-filtros-noticias" onSubmit={aplicarBusqueda}>
            <label>
              <span>Buscar noticias</span>
              <span className="portal-control-con-icono">
                <IconoBusqueda />
                <input
                  type="search"
                  placeholder="Título o palabra clave"
                  value={filtros.busqueda}
                  onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })}
                  maxLength="100"
                />
              </span>
            </label>
            <label>
              <span>Tipo de actividad</span>
              <select
                value={filtros.categoria}
                onChange={(evento) => establecerFiltros({ ...filtros, categoria: evento.target.value })}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((opcion) => (
                  <option key={opcion.codigo} value={opcion.codigo}>{opcion.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Fecha desde</span>
              <input type="date" value={filtros.fechaDesde} onChange={(evento) => establecerFiltros({ ...filtros, fechaDesde: evento.target.value })} />
            </label>
            <label>
              <span>Fecha hasta</span>
              <input type="date" min={filtros.fechaDesde || undefined} value={filtros.fechaHasta} onChange={(evento) => establecerFiltros({ ...filtros, fechaHasta: evento.target.value })} />
            </label>
            <button className="portal-boton portal-boton-verde" type="submit">Buscar</button>
          </form>
        </div>
      </section>

      <section className="portal-seccion portal-seccion-noticias-listado">
        <div className="portal-contenedor">
          <div className="portal-cabecera-listado-noticias">
            <p className="portal-sobrelinea">Información oficial</p>
            <h2>Últimas publicaciones recientes</h2>
          </div>
          {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          {cargando && <p className="portal-estado-carga" role="status">Cargando noticias…</p>}

          {!error && !cargando && publicaciones.length === 0 && (
            <div className="pagina-vacio">
              <img className="pagina-vacio-logotipo" src="/imagenes/escudo-guatemala.png" alt="" aria-hidden="true" />
              <h2>Aún no hay noticias publicadas</h2>
              <p>Las publicaciones aparecerán aquí.</p>
            </div>
          )}

          {publicaciones.length > 0 && (
            <div className="portal-listado-publico portal-listado-noticias">
              {publicaciones.map((publicacion) => (
                <article className="portal-elemento-publico tarjeta-noticia" key={publicacion.identificadorUrl}>
                  <div className="tarjeta-noticia-imagen">
                    {publicacion.imagenPrincipal
                      ? <img src={publicacion.imagenPrincipal.url} alt={publicacion.imagenPrincipal.textoAlternativo} loading="lazy" width={publicacion.imagenPrincipal.anchoPixeles} height={publicacion.imagenPrincipal.altoPixeles} />
                      : <IconoNoticias />}
                  </div>
                  <div className="tarjeta-noticia-contenido">
                    <div className="tarjeta-noticia-meta">
                      <p className="portal-sobrelinea">{publicacion.nombreCategoria}</p>
                      {formatearFechaPublicacion(publicacion) && <time dateTime={publicacion.fechaEditorial || publicacion.publicadoEn}>{formatearFechaPublicacion(publicacion)}</time>}
                    </div>
                    <h2><Link to={`/noticias/${publicacion.identificadorUrl}`}>{formatearTextoEditorial(publicacion.titulo)}</Link></h2>
                    <p>{limitarResumen(publicacion.resumen)}</p>
                    <Link className="portal-enlace-ver" to={`/noticias/${publicacion.identificadorUrl}`}>Leer publicación</Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {respuesta?.totalPaginas > 1 && (
            <nav className="portal-paginacion" aria-label="Paginación de noticias">
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

function formatearFechaPublicacion(publicacion) {
  const valor = publicacion.fechaEditorial ? `${publicacion.fechaEditorial}T00:00:00` : publicacion.publicadoEn;
  if (!valor) return "";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : formatoFecha.format(fecha);
}

function limitarResumen(resumen, limite = 25) {
  const palabras = resumen?.trim().split(/\s+/).filter(Boolean) || [];
  if (palabras.length <= limite) return resumen;
  return `${palabras.slice(0, limite).join(" ")}…`;
}

function IconoNoticias() {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="10" y="12" width="44" height="40" rx="4" /><path d="M20 23h23M20 33h23M20 43h14M15 23h1M15 33h1M15 43h1" /></svg>;
}

function IconoBusqueda() {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><circle cx="28" cy="28" r="14" /><path d="m39 39 13 13" /></svg>;
}
