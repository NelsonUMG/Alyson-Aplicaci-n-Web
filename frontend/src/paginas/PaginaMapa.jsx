import { CabeceraPagina } from "../componentes/CabeceraPagina";

export function PaginaMapa() {
  return (
    <>
      <CabeceraPagina
        etiqueta="Orientación"
        titulo="Mapa del parque"
        descripcion="Ubica entradas, áreas, servicios y recorridos accesibles."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor mapa-contenido">
          <div className="mapa-lienzo" aria-label="Mapa pendiente de habilitación">
            <span className="mapa-ruta mapa-ruta-uno" />
            <span className="mapa-ruta mapa-ruta-dos" />
            <i className="mapa-punto mapa-punto-uno" />
            <i className="mapa-punto mapa-punto-dos" />
            <i className="mapa-punto mapa-punto-tres" />
          </div>
          <aside className="mapa-informacion">
            <p className="portal-sobrelinea">Mapa interactivo</p>
            <h2>Coordenadas pendientes de confirmación</h2>
            <p>El mapa se habilitará únicamente con ubicaciones verificadas por la institución.</p>
            <ul>
              <li>Entradas y salidas</li>
              <li>Áreas deportivas</li>
              <li>Servicios y puntos de interés</li>
              <li>Recorridos accesibles</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
