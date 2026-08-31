import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { consultarPublicacion } from "../api/portalPublico";
import { obtenerMensajeError } from "../api/clienteHttp";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

export function PaginaDetallePublicacion() {
  const { identificadorUrl } = useParams();
  const [publicacion, establecerPublicacion] = useState(null);
  const [error, establecerError] = useState("");

  useEffect(() => {
    let paginaVigente = true;
    consultarPublicacion(identificadorUrl)
      .then((datos) => {
        if (paginaVigente) establecerPublicacion(datos);
      })
      .catch((errorCarga) => {
        if (paginaVigente) {
          establecerError(obtenerMensajeError(errorCarga, "No fue posible cargar la publicación solicitada."));
        }
      });
    return () => {
      paginaVigente = false;
    };
  }, [identificadorUrl]);

  return (
    <>
      <CabeceraPagina
        etiqueta={publicacion?.nombreCategoria || "Actualidad"}
        titulo={publicacion?.titulo || "Noticias"}
        descripcion={publicacion?.resumen || "Avisos y publicaciones oficiales del Parque Erick Barrondo."}
      />
      <section className="portal-seccion">
        <article className="portal-contenedor portal-detalle-publico">
          {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          {!error && !publicacion && <p>Cargando publicación…</p>}
          {publicacion && (
            <>
              {publicacion.imagenPrincipal && (
                <img
                  className="portal-imagen-detalle"
                  src={publicacion.imagenPrincipal.url}
                  alt={publicacion.imagenPrincipal.textoAlternativo}
                  width={publicacion.imagenPrincipal.anchoPixeles}
                  height={publicacion.imagenPrincipal.altoPixeles}
                />
              )}
              <p className="portal-contenido-publicacion">{publicacion.contenido}</p>
              {publicacion.imagenesSecundarias?.length > 0 && (
                <section className="portal-galeria-publicacion" aria-labelledby="titulo-galeria-publicacion">
                  <h2 id="titulo-galeria-publicacion">Galería</h2>
                  <div>
                    {publicacion.imagenesSecundarias.map((imagen) => (
                      <img
                        key={imagen.idImagenPublicacion}
                        src={imagen.url}
                        alt={imagen.textoAlternativo}
                        width={imagen.anchoPixeles}
                        height={imagen.altoPixeles}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          <Link className="portal-enlace-ver" to="/noticias">Volver a noticias</Link>
        </article>
      </section>
    </>
  );
}
