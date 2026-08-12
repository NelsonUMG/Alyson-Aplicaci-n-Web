import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarEvento,
  agregarImagenEvento,
  cancelarEvento,
  cerrarEvento,
  crearEvento,
  eliminarImagenEvento,
  finalizarEvento,
  listarEventosAdministrados,
  listarInscripcionesAdministradas,
  publicarEvento,
} from "../api/administracionEventos";
import { usarSesion } from "../autenticacion/ContextoSesion";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const eventoVacio = {
  idEvento: null,
  titulo: "",
  descripcion: "",
  lugar: "",
  iniciaEn: "",
  finalizaEn: "",
  inscripcionAbreEn: "",
  inscripcionCierraEn: "",
  capacidadTotal: 0,
  cantidadOcupada: 0,
  estado: "BORRADOR",
  esquemaFormularioJson: "",
  requisitos: [],
  tieneImagen: false,
  urlImagen: null,
  version: null,
};

function aFechaLocal(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function aInstant(valor) {
  return valor ? new Date(valor).toISOString() : null;
}

function prepararEdicion(evento) {
  return {
    ...evento,
    lugar: evento.lugar || "",
    iniciaEn: aFechaLocal(evento.iniciaEn),
    finalizaEn: aFechaLocal(evento.finalizaEn),
    inscripcionAbreEn: aFechaLocal(evento.inscripcionAbreEn),
    inscripcionCierraEn: aFechaLocal(evento.inscripcionCierraEn),
    esquemaFormularioJson: evento.esquemaFormularioJson || "",
    requisitos: evento.requisitos || [],
  };
}

export function PaginaAdministracionEventos() {
  const { usuario } = usarSesion();
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "", orden: "ACTUALIZACION" });
  const [eventoEdicion, establecerEventoEdicion] = useState(null);
  const [inscripciones, establecerInscripciones] = useState(paginaVacia);
  const [filtrosInscripcion, establecerFiltrosInscripcion] = useState({ busqueda: "", estado: "" });
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  const puedeCrear = usuario.permisos.includes("EVENTOCREAR");
  const puedeActualizar = usuario.permisos.includes("EVENTOACTUALIZAR");
  const puedeGestionarInscripciones = usuario.permisos.includes("EVENTOGESTIONARINSCRIPCIONES");
  const eventoEditable = eventoEdicion && !["CANCELADO", "FINALIZADO"].includes(eventoEdicion.estado);
  const puedeEditarFormulario = eventoEdicion && (
    eventoEdicion.idEvento ? puedeActualizar && eventoEditable : puedeCrear
  );

  useEffect(() => {
    let vigente = true;
    listarEventosAdministrados()
      .then((respuesta) => {
        if (vigente) {
          establecerPagina(respuesta);
          establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
        }
      })
      .catch((error) => {
        if (vigente) establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function recargarEventos(numeroPagina = 0) {
    const respuesta = await listarEventosAdministrados({ ...filtros, pagina: numeroPagina });
    establecerPagina(respuesta);
  }

  async function aplicarFiltros(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      await recargarEventos(0);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function nuevoEvento() {
    establecerEventoEdicion((actual) => (actual ? null : { ...eventoVacio, requisitos: [] }));
    establecerInscripciones(paginaVacia);
  }

  async function seleccionarEvento(evento) {
    establecerEventoEdicion(prepararEdicion(evento));
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
    if (!puedeGestionarInscripciones) return;
    try {
      establecerInscripciones(await listarInscripcionesAdministradas(evento.idEvento));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, error: error.message }));
    }
  }

  function actualizarCampo(nombre, valor) {
    establecerEventoEdicion((actual) => ({ ...actual, [nombre]: valor }));
  }

  function agregarRequisito() {
    establecerEventoEdicion((actual) => ({
      ...actual,
      requisitos: [...actual.requisitos, { descripcion: "", obligatorio: true, ordenVisualizacion: actual.requisitos.length }],
    }));
  }

  function actualizarRequisito(indice, cambios) {
    establecerEventoEdicion((actual) => ({
      ...actual,
      requisitos: actual.requisitos.map((requisito, posicion) => (
        posicion === indice ? { ...requisito, ...cambios } : requisito
      )),
    }));
  }

  function eliminarRequisito(indice) {
    establecerEventoEdicion((actual) => ({
      ...actual,
      requisitos: actual.requisitos
        .filter((_, posicion) => posicion !== indice)
        .map((requisito, posicion) => ({ ...requisito, ordenVisualizacion: posicion })),
    }));
  }

  async function guardarEvento(eventoFormulario) {
    eventoFormulario.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const datos = {
      titulo: eventoEdicion.titulo,
      descripcion: eventoEdicion.descripcion,
      lugar: eventoEdicion.lugar || null,
      iniciaEn: aInstant(eventoEdicion.iniciaEn),
      finalizaEn: aInstant(eventoEdicion.finalizaEn),
      inscripcionAbreEn: aInstant(eventoEdicion.inscripcionAbreEn),
      inscripcionCierraEn: aInstant(eventoEdicion.inscripcionCierraEn),
      capacidadTotal: Number(eventoEdicion.capacidadTotal),
      esquemaFormularioJson: eventoEdicion.esquemaFormularioJson || null,
      requisitos: eventoEdicion.requisitos.map((requisito, indice) => ({
        descripcion: requisito.descripcion,
        obligatorio: requisito.obligatorio,
        ordenVisualizacion: indice,
      })),
      version: eventoEdicion.version,
    };
    try {
      const guardado = eventoEdicion.idEvento
        ? await actualizarEvento(eventoEdicion.idEvento, datos)
        : await crearEvento(datos);
      establecerEventoEdicion(prepararEdicion(guardado));
      await recargarEventos(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Evento guardado." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function ejecutarEstado(accion) {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizado = await accion(eventoEdicion.idEvento, eventoEdicion.version);
      establecerEventoEdicion(prepararEdicion(actualizado));
      await recargarEventos(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Estado del evento actualizado." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function subirImagen(eventoFormulario) {
    eventoFormulario.preventDefault();
    const formulario = eventoFormulario.currentTarget;
    const archivo = new window.FormData(formulario).get("archivo");
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizado = await agregarImagenEvento(eventoEdicion.idEvento, archivo);
      establecerEventoEdicion(prepararEdicion(actualizado));
      formulario.reset();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen del evento actualizada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function quitarImagen() {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizado = await eliminarImagenEvento(eventoEdicion.idEvento);
      establecerEventoEdicion(prepararEdicion(actualizado));
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen del evento eliminada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function buscarInscripciones(eventoFormulario, numeroPagina = 0) {
    if (eventoFormulario) eventoFormulario.preventDefault();
    try {
      establecerInscripciones(await listarInscripcionesAdministradas(
        eventoEdicion.idEvento,
        { ...filtrosInscripcion, pagina: numeroPagina },
      ));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, error: error.message, mensaje: "" }));
    }
  }

  return (
    <main className="pagina-administracion pagina-administracion-eventos">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Eventos y cursos</h1>
      <p>Gestiona actividades, periodos de inscripción, requisitos y cupos.</p>

      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      {puedeCrear && <div className="acciones-superiores-administracion"><button className={eventoEdicion ? "boton-gestion-activo" : ""} type="button" aria-expanded={Boolean(eventoEdicion)} onClick={nuevoEvento}>{eventoEdicion ? "Ocultar Evento" : "Nuevo evento"}</button></div>}

      <section className="panel-edicion" aria-labelledby="titulo-listado-eventos">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-listado-eventos">Actividades registradas</h2>
            <p>{pagina.totalElementos} eventos y cursos encontrados.</p>
          </div>
        </div>
        <form className="filtros-administracion" onSubmit={aplicarFiltros}>
          <label>Buscar<input value={filtros.busqueda} onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="PUBLICADO">Publicado</option><option value="CERRADO">Cerrado</option><option value="CANCELADO">Cancelado</option><option value="FINALIZADO">Finalizado</option></select></label>
          <label>Orden<select value={filtros.orden} onChange={(evento) => establecerFiltros({ ...filtros, orden: evento.target.value })}><option value="ACTUALIZACION">Actualización</option><option value="FECHA">Fecha</option><option value="TITULO">Título</option><option value="ESTADO">Estado</option></select></label>
          <button type="submit" disabled={estado.cargando}>Aplicar</button>
        </form>
        <div className="lista-elementos-administracion lista-eventos-administracion">
          {pagina.contenido.map((evento) => (
            <button type="button" key={evento.idEvento} className={eventoEdicion?.idEvento === evento.idEvento ? "seleccionado" : ""} onClick={() => seleccionarEvento(evento)}>
              <span><strong>{evento.titulo}</strong><small>{evento.lugar || "Lugar pendiente"}</small></span>
              <span><strong>{evento.estado}</strong><small>{evento.cantidadOcupada} de {evento.capacidadTotal} cupos</small></span>
            </button>
          ))}
          {!estado.cargando && pagina.contenido.length === 0 && <p>No hay eventos registrados.</p>}
        </div>
        <div className="acciones-paginacion">
          <button type="button" disabled={pagina.pagina <= 0} onClick={() => recargarEventos(pagina.pagina - 1)}>Anterior</button>
          <span>Página {pagina.totalPaginas === 0 ? 0 : pagina.pagina + 1} de {pagina.totalPaginas}</span>
          <button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => recargarEventos(pagina.pagina + 1)}>Siguiente</button>
        </div>
      </section>

      {eventoEdicion && (
        <section className="panel-edicion" aria-labelledby="titulo-edicion-evento">
          <div className="cabecera-panel-administracion">
            <div><h2 id="titulo-edicion-evento">{eventoEdicion.idEvento ? "Editar evento" : "Nuevo evento"}</h2><p>Estado actual: {eventoEdicion.estado}</p></div>
            {eventoEdicion.idEvento && <span>{eventoEdicion.cantidadOcupada} ocupados · {eventoEdicion.capacidadTotal - eventoEdicion.cantidadOcupada} disponibles</span>}
          </div>
          <form className="formulario-administracion formulario-evento" onSubmit={guardarEvento}>
            <label>Título<input required maxLength="180" disabled={!puedeEditarFormulario} value={eventoEdicion.titulo} onChange={(evento) => actualizarCampo("titulo", evento.target.value)} /></label>
            <label>Lugar<input maxLength="180" disabled={!puedeEditarFormulario} value={eventoEdicion.lugar} onChange={(evento) => actualizarCampo("lugar", evento.target.value)} /></label>
            <label className="campo-ancho">Descripción<textarea required maxLength="20000" rows="5" disabled={!puedeEditarFormulario} value={eventoEdicion.descripcion} onChange={(evento) => actualizarCampo("descripcion", evento.target.value)} /></label>
            <label>Inicia<input type="datetime-local" required disabled={!puedeEditarFormulario} value={eventoEdicion.iniciaEn} onChange={(evento) => actualizarCampo("iniciaEn", evento.target.value)} /></label>
            <label>Finaliza<input type="datetime-local" disabled={!puedeEditarFormulario} value={eventoEdicion.finalizaEn} onChange={(evento) => actualizarCampo("finalizaEn", evento.target.value)} /></label>
            <label>Inscripción abre<input type="datetime-local" disabled={!puedeEditarFormulario} value={eventoEdicion.inscripcionAbreEn} onChange={(evento) => actualizarCampo("inscripcionAbreEn", evento.target.value)} /></label>
            <label>Inscripción cierra<input type="datetime-local" disabled={!puedeEditarFormulario} value={eventoEdicion.inscripcionCierraEn} onChange={(evento) => actualizarCampo("inscripcionCierraEn", evento.target.value)} /></label>
            <label>Capacidad total<input type="number" min={eventoEdicion.cantidadOcupada || 0} required disabled={!puedeEditarFormulario} value={eventoEdicion.capacidadTotal} onChange={(evento) => actualizarCampo("capacidadTotal", evento.target.value)} /></label>
            <label className="campo-ancho">Formulario aplicable en JSON<textarea maxLength="10000" rows="4" placeholder='{"campos": []}' disabled={!puedeEditarFormulario} value={eventoEdicion.esquemaFormularioJson} onChange={(evento) => actualizarCampo("esquemaFormularioJson", evento.target.value)} /></label>
            <div className="campo-ancho requisitos-administracion">
              <div className="cabecera-panel-administracion"><h3>Requisitos</h3>{puedeEditarFormulario && <button type="button" onClick={agregarRequisito}>Agregar requisito</button>}</div>
              {eventoEdicion.requisitos.map((requisito, indice) => (
                <div className="fila-requisito" key={`${requisito.idRequisitoEvento || "nuevo"}-${indice}`}>
                  <input aria-label={`Requisito ${indice + 1}`} maxLength="500" required disabled={!puedeEditarFormulario} value={requisito.descripcion} onChange={(evento) => actualizarRequisito(indice, { descripcion: evento.target.value })} />
                  <label><input type="checkbox" disabled={!puedeEditarFormulario} checked={requisito.obligatorio} onChange={(evento) => actualizarRequisito(indice, { obligatorio: evento.target.checked })} /> Obligatorio</label>
                  {puedeEditarFormulario && <button type="button" onClick={() => eliminarRequisito(indice)}>Quitar</button>}
                </div>
              ))}
              {eventoEdicion.requisitos.length === 0 && <p>No hay requisitos configurados.</p>}
            </div>
            {puedeEditarFormulario && <button className="campo-ancho" type="submit" disabled={estado.guardando}>Guardar evento</button>}
          </form>

          {eventoEdicion.idEvento && puedeActualizar && (
            <div className="acciones-editoriales">
              {eventoEdicion.estado === "BORRADOR" && <button type="button" onClick={() => ejecutarEstado(publicarEvento)}>Publicar</button>}
              {eventoEdicion.estado === "PUBLICADO" && <button type="button" onClick={() => ejecutarEstado(cerrarEvento)}>Cerrar inscripciones</button>}
              {["BORRADOR", "PUBLICADO", "CERRADO"].includes(eventoEdicion.estado) && <button type="button" onClick={() => ejecutarEstado(cancelarEvento)}>Cancelar evento</button>}
              {["PUBLICADO", "CERRADO"].includes(eventoEdicion.estado) && <button type="button" onClick={() => ejecutarEstado(finalizarEvento)}>Finalizar</button>}
            </div>
          )}

          {eventoEdicion.idEvento && puedeActualizar && eventoEditable && (
            <div className="gestion-imagen-evento">
              <h3>Imagen</h3>
              {eventoEdicion.tieneImagen && <img src={`${eventoEdicion.urlImagen}?version=${eventoEdicion.version}`} alt={eventoEdicion.titulo} />}
              <form onSubmit={subirImagen}><input name="archivo" type="file" accept="image/png,image/jpeg" required /><button type="submit" disabled={estado.guardando}>Cargar o reemplazar imagen</button></form>
              {eventoEdicion.tieneImagen && <button type="button" onClick={quitarImagen}>Eliminar imagen</button>}
            </div>
          )}
        </section>
      )}

      {eventoEdicion?.idEvento && puedeGestionarInscripciones && (
        <section className="panel-edicion" aria-labelledby="titulo-inscripciones-administradas">
          <h2 id="titulo-inscripciones-administradas">Inscripciones</h2>
          <form className="filtros-administracion" onSubmit={buscarInscripciones}>
            <label>Buscar persona<input value={filtrosInscripcion.busqueda} onChange={(evento) => establecerFiltrosInscripcion({ ...filtrosInscripcion, busqueda: evento.target.value })} /></label>
            <label>Estado<select value={filtrosInscripcion.estado} onChange={(evento) => establecerFiltrosInscripcion({ ...filtrosInscripcion, estado: evento.target.value })}><option value="">Todas</option><option value="CONFIRMADA">Confirmada</option><option value="CANCELADA">Cancelada</option></select></label>
            <button type="submit">Aplicar</button>
          </form>
          <div className="tabla-administracion tabla-inscripciones">
            <table><thead><tr><th>Persona</th><th>Correo</th><th>Estado</th><th>Confirmación</th></tr></thead><tbody>{inscripciones.contenido.map((inscripcion) => <tr key={inscripcion.idInscripcionEvento}><td>{inscripcion.nombre} {inscripcion.apellido}</td><td>{inscripcion.correo}</td><td>{inscripcion.estado}</td><td>{inscripcion.confirmadaEn ? new Date(inscripcion.confirmadaEn).toLocaleString("es-GT") : "—"}</td></tr>)}</tbody></table>
            {inscripciones.contenido.length === 0 && <p>No hay inscripciones para mostrar.</p>}
          </div>
          <div className="acciones-paginacion"><button type="button" disabled={inscripciones.pagina <= 0} onClick={() => buscarInscripciones(null, inscripciones.pagina - 1)}>Anterior</button><span>Página {inscripciones.totalPaginas === 0 ? 0 : inscripciones.pagina + 1} de {inscripciones.totalPaginas}</span><button type="button" disabled={inscripciones.pagina + 1 >= inscripciones.totalPaginas} onClick={() => buscarInscripciones(null, inscripciones.pagina + 1)}>Siguiente</button></div>
        </section>
      )}
    </main>
  );
}
