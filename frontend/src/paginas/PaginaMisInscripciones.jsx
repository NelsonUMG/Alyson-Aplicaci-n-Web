import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarMisInscripciones } from "../api/inscripcionesEventos";
import { formatearTextoEditorial, formatearTextoTecnico } from "../utilidades/formatoTexto";

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };

export function PaginaMisInscripciones() {
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [estado, establecerEstado] = useState({ cargando: true, error: "" });

  async function cargar(numeroPagina) {
    establecerEstado({ cargando: true, error: "" });
    try {
      establecerPagina(await listarMisInscripciones({ pagina: numeroPagina }));
      establecerEstado({ cargando: false, error: "" });
    } catch (error) {
      establecerEstado({ cargando: false, error: error.message });
    }
  }

  useEffect(() => {
    cargar(0);
  }, []);

  return (
    <main className="pagina-cuenta pagina-mis-inscripciones">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <header className="cabecera-cuenta">
        <div><p className="etiqueta-fase">Cuenta personal</p><h1>Mis inscripciones</h1><p>Consulta tus actividades confirmadas y canceladas.</p></div>
      </header>
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      <section className="panel-cuenta lista-mis-inscripciones" aria-label="Inscripciones registradas">
        {estado.cargando && <p>Cargando inscripciones…</p>}
        {!estado.cargando && pagina.contenido.length === 0 && <p>No tienes inscripciones registradas.</p>}
        {pagina.contenido.map((inscripcion) => (
          <article key={inscripcion.idInscripcionEvento}>
            <div><p className="etiqueta-fase">{formatearTextoTecnico(inscripcion.estado)}</p><h2>{formatearTextoEditorial(inscripcion.tituloEvento)}</h2><p>{formatoFecha.format(new Date(inscripcion.iniciaEn))}{inscripcion.lugar ? ` · ${inscripcion.lugar}` : ""}</p>{inscripcion.nombreGrupo && <p>Grupo: <strong>{inscripcion.nombreGrupo}</strong></p>}</div>
            <Link className="enlace-principal" to={`/eventos/${inscripcion.identificadorUrl}`}>Consultar actividad</Link>
          </article>
        ))}
        <div className="acciones-paginacion"><button type="button" disabled={pagina.pagina <= 0} onClick={() => cargar(pagina.pagina - 1)}>Anterior</button><span>Página {pagina.totalPaginas === 0 ? 0 : pagina.pagina + 1} de {pagina.totalPaginas}</span><button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cargar(pagina.pagina + 1)}>Siguiente</button></div>
      </section>
    </main>
  );
}
