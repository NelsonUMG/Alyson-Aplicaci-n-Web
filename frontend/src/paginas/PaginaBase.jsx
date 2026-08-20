import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarPublicaciones } from "../api/portalPublico";
import { formatearTextoEditorial } from "../utilidades/formatoTexto";

const publicacionesProvisionales = [
  {
    tipo: "Noticias",
    titulo: "Las noticias oficiales se publicarán desde el panel administrativo",
    descripcion: "Este espacio mostrará únicamente información revisada y autorizada por el personal responsable.",
  },
  {
    tipo: "Actividades",
    titulo: "Próximamente encontrarás eventos y cursos confirmados",
    descripcion: "Las fechas, requisitos, cupos y periodos de inscripción aparecerán cuando estén disponibles.",
  },
];

export function PaginaBase() {
  const [publicaciones, establecerPublicaciones] = useState(publicacionesProvisionales);
  const [indicePublicacion, establecerIndicePublicacion] = useState(0);
  const [segundosRestantes, establecerSegundosRestantes] = useState(10);
  const claveCarrusel = publicaciones.map((publicacion) => publicacion.identificadorUrl || publicacion.titulo).join("|");

  useEffect(() => {
    let paginaVigente = true;
    listarPublicaciones({ tamano: 5 })
      .then((respuesta) => {
        if (paginaVigente && respuesta.contenido.length > 0) {
          establecerPublicaciones(respuesta.contenido.map((publicacion) => ({
            ...publicacion,
            tipo: publicacion.nombreCategoria,
            descripcion: publicacion.resumen,
          })));
          establecerIndicePublicacion(0);
        }
      })
      .catch(() => undefined);
    return () => {
      paginaVigente = false;
    };
  }, []);

  useEffect(() => {
    if (publicaciones.length <= 1) return undefined;

    const temporizador = window.setTimeout(() => {
      if (segundosRestantes <= 1) {
        establecerIndicePublicacion((indiceActual) => (indiceActual + 1) % publicaciones.length);
        establecerSegundosRestantes(10);
      } else {
        establecerSegundosRestantes(segundosRestantes - 1);
      }
    }, 1000);

    return () => window.clearTimeout(temporizador);
  }, [claveCarrusel, indicePublicacion, publicaciones.length, segundosRestantes]);

  const publicacionActual = publicaciones[indicePublicacion] || publicaciones[0];

  function seleccionarPublicacion(indice) {
    establecerIndicePublicacion(indice);
    establecerSegundosRestantes(10);
  }

  return (
    <>
      <section className="inicio-portada" aria-labelledby="titulo-inicio">
        <div className="portal-contenedor inicio-portada-contenido">
          <p className="portal-sobrelinea">Bienvenido</p>
          <h1 id="titulo-inicio">Parque Erick Barrondo</h1>
          <p>Recreación y deporte para todas las personas.</p>
          <div className="inicio-acciones">
            <Link className="portal-boton portal-boton-principal" to="/nosotros">Conoce el parque</Link>
            <Link className="portal-boton portal-boton-secundario" to="/eventos">Ver próximos eventos</Link>
          </div>
        </div>
        <span className="inicio-imagen-provisional">Imagen provisional</span>
      </section>

      <section className="portal-seccion inicio-publicaciones" aria-labelledby="titulo-publicaciones">
        <div className="portal-contenedor">
          <div className="portal-cabecera-seccion">
            <div>
              <p className="portal-sobrelinea">Información reciente</p>
              <h2 id="titulo-publicaciones">Últimas publicaciones</h2>
            </div>
          </div>
          <div className="inicio-rejilla-publicaciones">
            <article className="inicio-publicacion" key={publicacionActual.identificadorUrl || publicacionActual.tipo}>
              <div className={`inicio-publicacion-imagen inicio-publicacion-imagen-${indicePublicacion + 1}`} aria-hidden="true">
                {publicacionActual.imagenPrincipal
                    ? <img src={publicacionActual.imagenPrincipal.url} alt="" loading="lazy" />
                    : <img className="inicio-publicacion-logotipo" src="/imagenes/escudo-guatemala.png" alt="" aria-hidden="true" />}
              </div>
              <div className="inicio-publicacion-texto">
                <span>{publicacionActual.tipo}</span>
                <h3>
                  {publicacionActual.identificadorUrl
                      ? <Link to={`/noticias/${publicacionActual.identificadorUrl}`}>{formatearTextoEditorial(publicacionActual.titulo)}</Link>
                      : formatearTextoEditorial(publicacionActual.titulo)}
                </h3>
                <p>{publicacionActual.descripcion}</p>
                {publicacionActual.identificadorUrl && (
                  <Link
                    className="portal-boton portal-boton-principal inicio-publicacion-enlace"
                    to={`/noticias/${publicacionActual.identificadorUrl}`}
                  >Leer más</Link>
                )}
              </div>
            </article>
          </div>
          {publicaciones.length > 1 && (
            <div className="inicio-carrusel-controles">
              <p>Siguiente noticia en {segundosRestantes} segundos.</p>
              <div aria-label="Seleccionar noticia" role="group">
                {publicaciones.map((publicacion, indice) => (
                  <button
                    type="button"
                    className={indice === indicePublicacion ? "activo" : ""}
                    aria-label={`Mostrar noticia ${indice + 1}: ${formatearTextoEditorial(publicacion.titulo)}`}
                    aria-pressed={indice === indicePublicacion}
                    key={publicacion.identificadorUrl || publicacion.tipo}
                    onClick={() => seleccionarPublicacion(indice)}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="portal-aviso-contenido">Contenido de actividades.</p>
        </div>
      </section>

    </>
  );
}
