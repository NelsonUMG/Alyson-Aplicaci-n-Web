import { CabeceraPagina } from "../componentes/CabeceraPagina";

export function PaginaNoticias() {
  return (
    <>
      <CabeceraPagina
        etiqueta="Actualidad"
        titulo="Noticias"
        descripcion="Avisos y publicaciones oficiales del Parque Erick Barrondo."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor pagina-vacio">
          <span aria-hidden="true">PEB</span>
          <h2>Aún no hay noticias publicadas</h2>
          <p>Las publicaciones aparecerán aquí.</p>
        </div>
      </section>
    </>
  );
}
