import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listarPersonasInscritasReporte,
  listarReporteInscripciones,
} from "../api/administracionReportes";
import { formatearTextoEditorial, formatearTextoTecnico } from "../utilidades/formatoTexto";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

function formatearFecha(fecha) {
  return fecha ? formatoFecha.format(new Date(fecha)) : "Sin horario definido";
}

function interpretarGrupos(curso) {
  if (!curso.configuracionGruposJson) return [];
  try {
    const configuracion = JSON.parse(curso.configuracionGruposJson);
    return Array.isArray(configuracion.grupos) ? configuracion.grupos : [];
  } catch { return []; }
}

const nombresDias = { LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles", JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo" };

function HorarioCurso({ curso, codigoGrupo = null }) {
  const grupos = interpretarGrupos(curso);
  const visibles = codigoGrupo ? grupos.filter((grupo) => grupo.codigo === codigoGrupo) : grupos;
  if (visibles.length > 0) {
    return <span className="detalle-horario-reporte">{visibles.map((grupo) => <span key={grupo.codigo}><strong>{grupo.nombre}</strong><small>{grupo.categoriaEdad}</small>{grupo.horarios.map((horario, indice) => <small key={`${grupo.codigo}-${indice}`}>{nombresDias[horario.dia] || horario.dia}, {horario.horaInicio} a {horario.horaFin}{horario.lugar ? ` · ${horario.lugar}` : ""}</small>)}</span>)}</span>;
  }
  return (
    <span className="detalle-horario-reporte">
      <span>{formatearFecha(curso.iniciaEn)}</span>
      {curso.finalizaEn && <small>Finaliza: {formatearFecha(curso.finalizaEn)}</small>}
      <small>Horario general · sin grupos configurados</small>
    </span>
  );
}

export function PaginaReportesInscripciones() {
  const [cursos, establecerCursos] = useState(paginaVacia);
  const [busquedaCursos, establecerBusquedaCursos] = useState("");
  const [cursoSeleccionado, establecerCursoSeleccionado] = useState(null);
  const [personas, establecerPersonas] = useState(paginaVacia);
  const [busquedaPersonas, establecerBusquedaPersonas] = useState("");
  const [estadoCursos, establecerEstadoCursos] = useState({ cargando: true, error: "" });
  const [estadoPersonas, establecerEstadoPersonas] = useState({ cargando: false, error: "" });

  useEffect(() => {
    let vigente = true;
    establecerEstadoCursos({ cargando: true, error: "" });
    const temporizador = window.setTimeout(() => {
      listarReporteInscripciones({ busqueda: busquedaCursos })
        .then((respuesta) => {
          if (!vigente) return;
          establecerCursos(respuesta);
          establecerEstadoCursos({ cargando: false, error: "" });
        })
        .catch((error) => {
          if (vigente) establecerEstadoCursos({ cargando: false, error: error.message });
        });
    }, busquedaCursos ? 250 : 0);
    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [busquedaCursos]);

  useEffect(() => {
    if (!cursoSeleccionado) return undefined;
    let vigente = true;
    establecerEstadoPersonas({ cargando: true, error: "" });
    const temporizador = window.setTimeout(() => {
      listarPersonasInscritasReporte(cursoSeleccionado.idEvento, { busqueda: busquedaPersonas })
        .then((respuesta) => {
          if (!vigente) return;
          establecerPersonas(respuesta);
          establecerEstadoPersonas({ cargando: false, error: "" });
        })
        .catch((error) => {
          if (vigente) establecerEstadoPersonas({ cargando: false, error: error.message });
        });
    }, busquedaPersonas ? 250 : 0);
    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [busquedaPersonas, cursoSeleccionado]);

  async function cambiarPaginaCursos(numeroPagina) {
    establecerEstadoCursos({ cargando: true, error: "" });
    try {
      establecerCursos(await listarReporteInscripciones({
        busqueda: busquedaCursos,
        pagina: numeroPagina,
      }));
      establecerEstadoCursos({ cargando: false, error: "" });
    } catch (error) {
      establecerEstadoCursos({ cargando: false, error: error.message });
    }
  }

  async function cambiarPaginaPersonas(numeroPagina) {
    establecerEstadoPersonas({ cargando: true, error: "" });
    try {
      establecerPersonas(await listarPersonasInscritasReporte(cursoSeleccionado.idEvento, {
        busqueda: busquedaPersonas,
        pagina: numeroPagina,
      }));
      establecerEstadoPersonas({ cargando: false, error: "" });
    } catch (error) {
      establecerEstadoPersonas({ cargando: false, error: error.message });
    }
  }

  function consultarPersonas(curso) {
    establecerCursoSeleccionado(curso);
    establecerBusquedaPersonas("");
    establecerPersonas(paginaVacia);
  }

  return (
    <main className="pagina-administracion pagina-reportes-inscripciones">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Consulta administrativa</p>
      <h1>Reportes de inscripciones</h1>
      <p>Consulta los cursos o actividades y las personas que mantienen una inscripción confirmada.</p>
      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Reportes</summary>
            <div className="acciones-superiores-administracion">
              <button className="boton-gestion-activo" type="button" aria-current="page">
                Inscripciones a cursos
              </button>
            </div>
          </details>
        </aside>

        <div className="contenido-modulo-administracion">
          {estadoCursos.error && <p className="mensaje-error" role="alert">{estadoCursos.error}</p>}
          <section className="panel-edicion" aria-labelledby="titulo-reporte-cursos">
            <div className="cabecera-panel-administracion">
              <div>
                <h2 id="titulo-reporte-cursos">Cursos y actividades</h2>
                <p>{cursos.totalElementos} registros encontrados.</p>
              </div>
            </div>
            <div className="busqueda-usuarios busqueda-reporte">
              <label htmlFor="busquedaCursoReporte">Buscar curso o actividad</label>
              <input id="busquedaCursoReporte" maxLength="100" autoComplete="off" value={busquedaCursos} onChange={(evento) => establecerBusquedaCursos(evento.target.value)} />
            </div>
            <div className="tabla-contenedor tabla-reporte-inscripciones">
              <table>
                <thead><tr><th>Curso o actividad</th><th>Horario</th><th>Lugar</th><th>Personas inscritas</th><th><span className="solo-lector">Acciones</span></th></tr></thead>
                <tbody>
                  {cursos.contenido.map((curso) => (
                    <tr key={curso.idEvento}>
                      <td><strong>{formatearTextoEditorial(curso.titulo)}</strong><small>{formatearTextoTecnico(curso.estado)}</small></td>
                      <td><HorarioCurso curso={curso} /></td>
                      <td>{curso.lugar || "Sin lugar definido"}</td>
                      <td>{curso.cantidadPersonasInscritas}</td>
                      <td><button type="button" onClick={() => consultarPersonas(curso)}>Ver personas</button></td>
                    </tr>
                  ))}
                  {!estadoCursos.cargando && cursos.contenido.length === 0 && <tr><td colSpan="5">No hay cursos o actividades que coincidan con la búsqueda.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="acciones-paginacion">
              <button type="button" disabled={estadoCursos.cargando || cursos.pagina <= 0} onClick={() => cambiarPaginaCursos(cursos.pagina - 1)}>Anterior</button>
              <span>Página {cursos.totalPaginas === 0 ? 0 : cursos.pagina + 1} de {cursos.totalPaginas}</span>
              <button type="button" disabled={estadoCursos.cargando || cursos.pagina + 1 >= cursos.totalPaginas} onClick={() => cambiarPaginaCursos(cursos.pagina + 1)}>Siguiente</button>
            </div>
          </section>

          {cursoSeleccionado && (
            <section className="panel-edicion" aria-labelledby="titulo-personas-reporte">
              <div className="cabecera-panel-administracion">
                <div>
                  <h2 id="titulo-personas-reporte">Personas inscritas en {formatearTextoEditorial(cursoSeleccionado.titulo)}</h2>
                  <p>{personas.totalElementos} inscripciones confirmadas.</p>
                </div>
                <button className="boton-secundario" type="button" onClick={() => establecerCursoSeleccionado(null)}>Cerrar detalle</button>
              </div>
              {estadoPersonas.error && <p className="mensaje-error" role="alert">{estadoPersonas.error}</p>}
              <div className="busqueda-usuarios busqueda-reporte">
                <label htmlFor="busquedaPersonaReporte">Buscar persona por nombre o correo</label>
                <input id="busquedaPersonaReporte" maxLength="100" autoComplete="off" value={busquedaPersonas} onChange={(evento) => establecerBusquedaPersonas(evento.target.value)} />
              </div>
              <div className="tabla-contenedor tabla-reporte-personas">
                <table>
                  <thead><tr><th>Persona</th><th>Correo</th><th>Horario o grupo</th><th>Confirmación</th></tr></thead>
                  <tbody>
                    {personas.contenido.map((persona) => (
                      <tr key={persona.idInscripcionEvento}>
                        <td>{persona.nombre} {persona.apellido}</td>
                        <td>{persona.correo}</td>
                        <td><HorarioCurso curso={cursoSeleccionado} codigoGrupo={persona.codigoGrupo} /></td>
                        <td>{formatearFecha(persona.confirmadaEn)}</td>
                      </tr>
                    ))}
                    {!estadoPersonas.cargando && personas.contenido.length === 0 && <tr><td colSpan="4">No hay inscripciones confirmadas que coincidan con la búsqueda.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="acciones-paginacion">
                <button type="button" disabled={estadoPersonas.cargando || personas.pagina <= 0} onClick={() => cambiarPaginaPersonas(personas.pagina - 1)}>Anterior</button>
                <span>Página {personas.totalPaginas === 0 ? 0 : personas.pagina + 1} de {personas.totalPaginas}</span>
                <button type="button" disabled={estadoPersonas.cargando || personas.pagina + 1 >= personas.totalPaginas} onClick={() => cambiarPaginaPersonas(personas.pagina + 1)}>Siguiente</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
