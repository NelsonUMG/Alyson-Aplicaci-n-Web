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

function IconoInscripcion({ tipo }) {
  const propiedades = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (tipo === "calendario") return <svg {...propiedades}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6" /></svg>;
  if (tipo === "confirmada") return <svg {...propiedades}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></svg>;
  if (tipo === "cancelada") return <svg {...propiedades}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>;
  if (tipo === "inicio") return <svg {...propiedades}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
  if (tipo === "usuario") return <svg {...propiedades}><circle cx="12" cy="8" r="3" /><path d="M5 20c.7-4.2 3.1-6 7-6s6.3 1.8 7 6" /></svg>;
  return <svg {...propiedades}><path d="M8 2v4M16 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="2" /><path d="m9 15 2 2 4-5" /></svg>;
}

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

  const confirmadasEnPagina = pagina.contenido.filter((inscripcion) => inscripcion.estado === "CONFIRMADA").length;
  const canceladasEnPagina = pagina.contenido.filter((inscripcion) => inscripcion.estado === "CANCELADA").length;

  return (
    <div className="aplicacion-inscripciones">
      <header className="cabecera-portal-inscripciones">
        <div className="contenido-cabecera-inscripciones">
          <Link className="marca-inscripciones" to="/" aria-label="Parque Erick Barrondo · Inicio">
            <span className="emblema-inscripciones"><img src="/imagenes/escudo-guatemala.png" alt="" aria-hidden="true" /></span>
            <span><strong>Parque Erick Barrondo</strong><small>Portal de gestiones</small></span>
          </Link>
          <Link className="cuenta-inscripciones" to="/perfil"><IconoInscripcion tipo="usuario" /><span>Mi cuenta</span><b>U</b></Link>
        </div>
      </header>

      <main className="contenido-inscripciones">
        <nav className="miga-inscripciones" aria-label="Ruta actual"><Link to="/">Inicio</Link><span>›</span><strong>Mis inscripciones</strong></nav>
        <section className="hero-inscripciones">
          <div><p>Cuenta personal</p><h1>Mis inscripciones</h1><span>Consulta tus próximas actividades y el historial de eventos en los que participaste.</span></div>
        </section>

        <section className="resumen-inscripciones" aria-label="Resumen de inscripciones">
          <article><span><IconoInscripcion tipo="calendario" /></span><div><strong>{pagina.totalElementos}</strong><p>Inscripciones registradas</p></div></article>
          <article><span><IconoInscripcion tipo="confirmada" /></span><div><strong>{confirmadasEnPagina}</strong><p>Confirmadas en esta página</p></div></article>
          <article><span><IconoInscripcion tipo="cancelada" /></span><div><strong>{canceladasEnPagina}</strong><p>Canceladas en esta página</p></div></article>
        </section>

        {estado.error && <p className="mensaje-error mensaje-inscripciones" role="alert">{estado.error}</p>}
        <section className="panel-inscripciones" aria-label="Inscripciones registradas">
          <header><div><p>Actividad personal</p><h2>Tus eventos</h2></div><span>{pagina.totalElementos} {pagina.totalElementos === 1 ? "registro" : "registros"}</span></header>
          {estado.cargando && <div className="carga-inscripciones"><i /><p>Cargando inscripciones…</p></div>}
          {!estado.cargando && pagina.contenido.length === 0 && <div className="vacio-inscripciones"><span><IconoInscripcion tipo="calendario" /></span><h3>Aún no tienes inscripciones</h3><p>Explora las actividades del parque y reserva tu participación en los eventos disponibles.</p><Link to="/eventos">Ver próximos eventos <span>→</span></Link></div>}
          <div className="lista-inscripciones-modernas">
            {pagina.contenido.map((inscripcion) => (
              <article key={inscripcion.idInscripcionEvento}>
                <span className={`icono-estado-inscripcion estado-${inscripcion.estado.toLowerCase()}`}><IconoInscripcion tipo={inscripcion.estado === "CANCELADA" ? "cancelada" : "confirmada"} /></span>
                <div className="datos-inscripcion"><p className={`estado-inscripcion estado-${inscripcion.estado.toLowerCase()}`}>{formatearTextoTecnico(inscripcion.estado)}</p><h3>{formatearTextoEditorial(inscripcion.tituloEvento)}</h3><time>{formatoFecha.format(new Date(inscripcion.iniciaEn))}</time>{inscripcion.lugar && <p className="lugar-inscripcion">{inscripcion.lugar}</p>}{inscripcion.nombreGrupo && <p className="grupo-inscripcion">Grupo: <strong>{inscripcion.nombreGrupo}</strong></p>}</div>
                <Link to={`/eventos/${inscripcion.identificadorUrl}`}>Consultar actividad <span>→</span></Link>
              </article>
            ))}
          </div>
          {pagina.totalPaginas > 0 && <div className="paginacion-inscripciones"><button type="button" disabled={pagina.pagina <= 0} onClick={() => cargar(pagina.pagina - 1)}>← Anterior</button><span>Página <strong>{pagina.pagina + 1}</strong> de {pagina.totalPaginas}</span><button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cargar(pagina.pagina + 1)}>Siguiente →</button></div>}
        </section>
      </main>
    </div>
  );
}
