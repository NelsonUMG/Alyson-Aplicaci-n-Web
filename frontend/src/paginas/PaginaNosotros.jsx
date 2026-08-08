import { useEffect, useState } from "react";
import { consultarContenidoInstitucional } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

const contenidoInicial = {
  resumen: "El Centro Deportivo Erick Bernabé Barrondo García es un espacio público de recreación, deporte y naturaleza en la Ciudad de Guatemala. Sus áreas deportivas, ciclovía, juegos y espacios familiares permiten una convivencia activa y gratuita.",
  mision: "Promover el deporte, la recreación y la convivencia familiar mediante espacios accesibles, seguros e inclusivos para la comunidad.",
  vision: "Ser un referente de bienestar, inclusión y desarrollo deportivo para las familias de Guatemala.",
  valores: "Inclusión, respeto, bienestar, convivencia, seguridad y cuidado de la naturaleza.",
};

export function PaginaNosotros() {
  const [contenido, establecerContenido] = useState(contenidoInicial);

  useEffect(() => {
    let vigente = true;
    consultarContenidoInstitucional()
      .then((contenidoRecibido) => {
        if (vigente) establecerContenido(contenidoRecibido);
      })
      .catch(() => {
        // El contenido inicial conserva la información visible mientras el servicio no esté disponible.
      });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <>
      <CabeceraPagina
        etiqueta="Información institucional"
        titulo="Nosotros"
        descripcion="Conoce la identidad, propósito y compromiso del Parque Erick Barrondo."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor nosotros-panel">
          <div className="nosotros-introduccion">
            <p className="portal-sobrelinea">Sobre el parque</p>
            <h2>Un espacio público al servicio de la comunidad</h2>
            <p>{contenido.resumen}</p>
          </div>
          <div className="nosotros-propositos">
            <article>
              <span>01</span>
              <h3>Misión</h3>
              <p>{contenido.mision}</p>
            </article>
            <article>
              <span>02</span>
              <h3>Visión</h3>
              <p>{contenido.vision}</p>
            </article>
            <article>
              <span>03</span>
              <h3>Valores</h3>
              <p>{contenido.valores}</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
