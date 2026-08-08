import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarPublicaciones } from "../api/portalPublico";

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
        }
      })
      .catch(() => undefined);
    return () => {
      paginaVigente = false;
    };
  }, []);

  return (
    <>
      <section className="inicio-portada" aria-labelledby="titulo-inicio">
        <div className="portal-contenedor inicio-portada-contenido">
          <p className="portal-sobrelinea">Bienvenido</p>
          <h1 id="titulo-inicio">Parque Erick Barrondo</h1>
          <p>Recreación para parque.</p>
          <div className="inicio-acciones">
            <Link className="portal-boton portal-boton-principal" to="/nosotros">Conoce el parque</Link>
            <Link className="portal-boton portal-boton-secundario" to="/eventos">Ver próximos eventos</Link>
          </div>
        </div>
        <span className="inicio-imagen-provisional">Imagen provisional</span>
      </section>

      <section className="inicio-franja" aria-label="Accesos rápidos">
        <div className="portal-contenedor inicio-franja-enlaces">
          <Link to="/areas-servicios"><strong>Áreas y servicios</strong><span>Conoce los espacios disponibles</span></Link>
          <Link to="/eventos"><strong>Eventos</strong><span>Consulta las próximas actividades</span></Link>
          <Link to="/mapa"><strong>Cómo llegar</strong><span>Ubica entradas y áreas del parque</span></Link>
          <Link to="/bicicletas"><strong>Bicicletas</strong><span>Consulta la disponibilidad actual</span></Link>
        </div>
      </section>

      <section className="portal-seccion inicio-publicaciones" aria-labelledby="titulo-publicaciones">
        <div className="portal-contenedor">
          <div className="portal-cabecera-seccion">
            <div>
              <p className="portal-sobrelinea">Información reciente</p>
              <h2 id="titulo-publicaciones">Últimas publicaciones</h2>
            </div>
            <Link className="portal-enlace-ver" to="/noticias">Ver todas las noticias <span aria-hidden="true">→</span></Link>
          </div>
          <div className="inicio-rejilla-publicaciones">
            {publicaciones.map((publicacion, indice) => (
              <article className="inicio-publicacion" key={publicacion.identificadorUrl || publicacion.tipo}>
                <div className={`inicio-publicacion-imagen inicio-publicacion-imagen-${indice + 1}`} aria-hidden="true">
                  {publicacion.imagenPrincipal
                    ? <img src={publicacion.imagenPrincipal.url} alt="" loading="lazy" />
                    : <img className="inicio-publicacion-logotipo" src="/imagenes/escudo-guatemala.png" alt="" aria-hidden="true" />}
                </div>
                <div className="inicio-publicacion-texto">
                  <span>{publicacion.tipo}</span>
                  <h3>
                    {publicacion.identificadorUrl
                      ? <Link to={`/noticias/${publicacion.identificadorUrl}`}>{publicacion.titulo}</Link>
                      : publicacion.titulo}
                  </h3>
                  <p>{publicacion.descripcion}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="portal-aviso-contenido">Contenido  de actividades.</p>
        </div>
      </section>

      <section className="inicio-aliados" aria-labelledby="titulo-aliados">
        <div className="portal-contenedor">
          <h2 id="titulo-aliados">Instituciones aliadas</h2>
          <div className="inicio-aliados-lista">
            <span>Espacio reservado</span>
            <span>Espacio reservado</span>
            <span>Espacio reservado</span>
          </div>
          <p>Si en caso tiene patrocinadores o eliminarlo esta seción.</p>
        </div>
      </section>
    </>
  );
}
