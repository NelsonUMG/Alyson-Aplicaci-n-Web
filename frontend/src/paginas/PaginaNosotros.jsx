import { CabeceraPagina } from "../componentes/CabeceraPagina";

export function PaginaNosotros() {
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
            <p>
              Irá información de resumen de parque de Erick BarrondoS.
            </p>
          </div>
          <div className="nosotros-propositos">
            <article>
              <span>01</span>
              <h3>Misión</h3>
              <p>Texto institucional pendiente de validación y autorización.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Visión</h3>
              <p>Texto institucional pendiente de validación y autorización.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Valores</h3>
              <p>Contenido pendiente de ser proporcionado por la institución.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
