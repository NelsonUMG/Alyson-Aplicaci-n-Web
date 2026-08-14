import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarEvento,
  agregarImagenEvento,
  agregarImagenSecundariaEvento,
  cancelarEvento,
  cerrarEvento,
  crearEvento,
  eliminarImagenEvento,
  eliminarImagenSecundariaEvento,
  finalizarEvento,
  listarEventosAdministrados,
  listarImagenesSecundariasEvento,
  listarInscripcionesAdministradas,
  publicarEvento,
} from "../api/administracionEventos";
import { usarSesion } from "../autenticacion/ContextoSesion";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const tiposCampoFormulario = [
  { valor: "FECHA", etiqueta: "Fecha" },
  { valor: "DPI_CUI", etiqueta: "DPI o CUI" },
  { valor: "NUMERO", etiqueta: "Número" },
  { valor: "TEXTO_CORTO", etiqueta: "Texto corto" },
  { valor: "TEXTO_LARGO", etiqueta: "Texto de varios párrafos" },
  { valor: "SI_NO", etiqueta: "Sí o no" },
  { valor: "SELECCION_UNICA", etiqueta: "Elegir una opción" },
];
const tiposCampoPermitidos = new Set(tiposCampoFormulario.map((tipo) => tipo.valor));
let secuenciaCampoFormulario = 0;

function crearClaveCampoFormulario() {
  secuenciaCampoFormulario += 1;
  return `campo-formulario-${secuenciaCampoFormulario}`;
}

function campoFormularioVacio() {
  return {
    clave: crearClaveCampoFormulario(),
    id: null,
    etiqueta: "",
    tipo: "TEXTO_CORTO",
    obligatorio: true,
    opciones: [],
  };
}

function interpretarFormularioJson(esquemaFormularioJson) {
  if (!esquemaFormularioJson?.trim()) return [];
  try {
    const estructura = JSON.parse(esquemaFormularioJson);
    if (!Array.isArray(estructura?.campos)) return [];
    return estructura.campos.map((campo) => ({
      clave: crearClaveCampoFormulario(),
      id: String(campo.id || ""),
      etiqueta: String(campo.etiqueta || campo.pregunta || campo.nombre || ""),
      tipo: tiposCampoPermitidos.has(campo.tipo) ? campo.tipo : "TEXTO_CORTO",
      obligatorio: campo.obligatorio !== false,
      opciones: Array.isArray(campo.opciones) ? campo.opciones.map(String) : [],
    }));
  } catch {
    return [];
  }
}

function generarFormularioJson(camposFormulario) {
  if (camposFormulario.length === 0) return null;
  const campos = camposFormulario.map((campo, indice) => {
    const normalizado = {
      id: campo.id || `campo_${indice + 1}`,
      etiqueta: campo.etiqueta.trim(),
      tipo: campo.tipo,
      obligatorio: Boolean(campo.obligatorio),
    };
    if (campo.tipo === "SELECCION_UNICA") {
      normalizado.opciones = campo.opciones.map((opcion) => opcion.trim()).filter(Boolean);
    }
    return normalizado;
  });
  return JSON.stringify({ campos });
}

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
  camposFormulario: [],
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
    camposFormulario: interpretarFormularioJson(evento.esquemaFormularioJson),
    requisitos: evento.requisitos || [],
  };
}

function respuestasInscripcion(inscripcion, camposFormulario) {
  if (!inscripcion.respuestasFormularioJson) return [];
  try {
    const respuestas = JSON.parse(inscripcion.respuestasFormularioJson);
    return camposFormulario
      .filter((campo) => campo.id && respuestas[campo.id] !== undefined)
      .map((campo) => ({
        etiqueta: campo.etiqueta,
        valor: typeof respuestas[campo.id] === "boolean"
          ? (respuestas[campo.id] ? "Sí" : "No")
          : String(respuestas[campo.id]),
      }));
  } catch {
    return [];
  }
}

export function PaginaAdministracionEventos() {
  const { usuario } = usarSesion();
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "", orden: "ACTUALIZACION" });
  const [eventoEdicion, establecerEventoEdicion] = useState(null);
  const [mostrarListado, establecerMostrarListado] = useState(false);
  const [inscripciones, establecerInscripciones] = useState(paginaVacia);
  const [imagenesSecundarias, establecerImagenesSecundarias] = useState([]);
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
    if (eventoEdicion && !eventoEdicion.idEvento) return;
    establecerMostrarListado(false);
    establecerEventoEdicion({ ...eventoVacio, camposFormulario: [], requisitos: [] });
    establecerInscripciones(paginaVacia);
    establecerImagenesSecundarias([]);
  }

  async function seleccionarEvento(evento) {
    establecerMostrarListado(true);
    establecerEventoEdicion(prepararEdicion(evento));
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
    try {
      const solicitudes = [listarImagenesSecundariasEvento(evento.idEvento)];
      if (puedeGestionarInscripciones) {
        solicitudes.push(listarInscripcionesAdministradas(evento.idEvento));
      }
      const resultados = await Promise.all(solicitudes);
      establecerImagenesSecundarias(resultados[0]);
      if (puedeGestionarInscripciones) establecerInscripciones(resultados[1]);
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, error: error.message }));
    }
  }

  function alternarListado() {
    if (mostrarListado) return;
    establecerEventoEdicion(null);
    establecerInscripciones(paginaVacia);
    establecerImagenesSecundarias([]);
    establecerMostrarListado(true);
  }

  function actualizarCampo(nombre, valor) {
    establecerEventoEdicion((actual) => ({ ...actual, [nombre]: valor }));
  }

  function agregarCampoFormulario() {
    establecerEventoEdicion((actual) => {
      const camposFormulario = actual.camposFormulario || [];
      return {
        ...actual,
        camposFormulario: camposFormulario.length >= 30
          ? camposFormulario
          : [...camposFormulario, campoFormularioVacio()],
      };
    });
  }

  function actualizarCampoFormulario(indice, cambios) {
    establecerEventoEdicion((actual) => ({
      ...actual,
      camposFormulario: (actual.camposFormulario || []).map((campo, posicion) => (
        posicion === indice ? { ...campo, ...cambios } : campo
      )),
    }));
  }

  function eliminarCampoFormulario(indice) {
    establecerEventoEdicion((actual) => ({
      ...actual,
      camposFormulario: (actual.camposFormulario || []).filter((_, posicion) => posicion !== indice),
    }));
  }

  function moverCampoFormulario(indice, desplazamiento) {
    establecerEventoEdicion((actual) => {
      const camposActuales = actual.camposFormulario || [];
      const destino = indice + desplazamiento;
      if (destino < 0 || destino >= camposActuales.length) return actual;
      const camposFormulario = [...camposActuales];
      [camposFormulario[indice], camposFormulario[destino]] = [camposFormulario[destino], camposFormulario[indice]];
      return { ...actual, camposFormulario };
    });
  }

  async function guardarEvento(eventoFormulario) {
    eventoFormulario.preventDefault();
    const camposFormulario = eventoEdicion.camposFormulario || [];
    const seleccionSinOpciones = camposFormulario.findIndex((campo) => (
      campo.tipo === "SELECCION_UNICA"
      && campo.opciones.map((opcion) => opcion.trim()).filter(Boolean).length < 2
    ));
    if (seleccionSinOpciones >= 0) {
      establecerEstado((actual) => ({
        ...actual,
        error: `El requisito ${seleccionSinOpciones + 1} necesita al menos dos opciones.`,
        mensaje: "",
      }));
      return;
    }
    const esquemaFormularioJson = generarFormularioJson(camposFormulario);
    if (esquemaFormularioJson && esquemaFormularioJson.length > 10000) {
      establecerEstado((actual) => ({
        ...actual,
        error: "El formulario adicional es demasiado extenso.",
        mensaje: "",
      }));
      return;
    }
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
      esquemaFormularioJson,
      requisitos: [],
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

  async function subirImagenSecundaria(eventoFormulario) {
    eventoFormulario.preventDefault();
    const formulario = eventoFormulario.currentTarget;
    const archivo = new window.FormData(formulario).get("archivoSecundario");
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const agregada = await agregarImagenSecundariaEvento(eventoEdicion.idEvento, archivo);
      establecerImagenesSecundarias((actuales) => [...actuales, agregada]);
      formulario.reset();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen secundaria agregada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function quitarImagenSecundaria(idImagenEvento) {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await eliminarImagenSecundariaEvento(eventoEdicion.idEvento, idImagenEvento);
      establecerImagenesSecundarias((actuales) => (
        actuales.filter((imagen) => imagen.idImagenEvento !== idImagenEvento)
      ));
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen secundaria eliminada." });
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

  const eventoExistenteSeleccionado = Boolean(mostrarListado && eventoEdicion?.idEvento);
  const camposFormularioEvento = eventoEdicion?.camposFormulario || [];

  return (
    <main className="pagina-administracion pagina-administracion-eventos">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Eventos y cursos</h1>
      <p>Gestiona actividades, periodos de inscripción, requisitos y cupos.</p>

      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Eventos y cursos</summary>
      <div className="acciones-superiores-administracion">
        {puedeCrear && <button className={eventoEdicion && !eventoEdicion.idEvento ? "boton-gestion-activo" : ""} type="button" aria-expanded={Boolean(eventoEdicion && !eventoEdicion.idEvento)} onClick={nuevoEvento}>Nuevo evento</button>}
        <button className={mostrarListado ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarListado} onClick={alternarListado}>Listado de eventos</button>
      </div>
          </details>
        </aside>
        <div className="contenido-modulo-administracion">
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      {mostrarListado && <section className="panel-edicion panel-listado-administracion" aria-labelledby="titulo-listado-eventos">
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
        <div className="cabecera-listado-administracion" aria-hidden="true">
          <span>Actividad</span><span>Lugar</span><span>Estado y cupos</span>
        </div>
        <div className="lista-elementos-administracion lista-eventos-administracion lista-tabular-administracion">
          {pagina.contenido.map((evento) => (
            <button
              type="button"
              key={evento.idEvento}
              className={eventoEdicion?.idEvento === evento.idEvento ? "seleccionado" : ""}
              aria-expanded={eventoEdicion?.idEvento === evento.idEvento}
              aria-controls={eventoEdicion?.idEvento === evento.idEvento ? "detalle-evento-seleccionado" : undefined}
              onClick={() => seleccionarEvento(evento)}
            >
              <span><strong>{evento.titulo}</strong></span>
              <span>{evento.lugar || "Lugar pendiente"}</span>
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
      </section>}

      {eventoEdicion && (
        <section
          id={eventoExistenteSeleccionado ? "detalle-evento-seleccionado" : undefined}
          className={`panel-edicion${eventoExistenteSeleccionado ? " panel-detalle-administracion" : ""}`}
          aria-labelledby="titulo-edicion-evento"
        >
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
            <div className="campo-ancho constructor-formulario-evento">
              <div className="cabecera-panel-administracion">
                <div>
                  <h3>Requisitos para la inscripción</h3>
                  <p>Crea los campos que deberá completar cada persona, como fecha, DPI/CUI o número.</p>
                </div>
                {puedeEditarFormulario && (
                  <button type="button" disabled={camposFormularioEvento.length >= 30} onClick={agregarCampoFormulario}>Crear requisito</button>
                )}
              </div>
              <div className="lista-campos-formulario-evento">
                {camposFormularioEvento.map((campo, indice) => (
                  <fieldset className="campo-formulario-evento" key={campo.clave}>
                    <legend>Requisito {indice + 1}</legend>
                    <label className="campo-formulario-etiqueta">
                      Nombre del requisito
                      <input
                        aria-label={`Nombre del requisito ${indice + 1}`}
                        required
                        maxLength="180"
                        disabled={!puedeEditarFormulario}
                        placeholder="Ejemplo: DPI/CUI del participante"
                        value={campo.etiqueta}
                        onChange={(evento) => actualizarCampoFormulario(indice, { etiqueta: evento.target.value })}
                      />
                    </label>
                    <label>
                      Tipo de campo
                      <select
                        aria-label={`Tipo de campo del requisito ${indice + 1}`}
                        disabled={!puedeEditarFormulario}
                        value={campo.tipo}
                        onChange={(evento) => actualizarCampoFormulario(indice, { tipo: evento.target.value })}
                      >
                        {tiposCampoFormulario.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}
                      </select>
                    </label>
                    <label className="campo-formulario-obligatorio">
                      <input
                        type="checkbox"
                        disabled={!puedeEditarFormulario}
                        checked={campo.obligatorio}
                        onChange={(evento) => actualizarCampoFormulario(indice, { obligatorio: evento.target.checked })}
                      />
                      Respuesta obligatoria
                    </label>
                    {campo.tipo === "SELECCION_UNICA" && (
                      <label className="campo-formulario-opciones">
                        Opciones, una por línea
                        <textarea
                          aria-label={`Opciones del requisito ${indice + 1}`}
                          required
                          rows="3"
                          maxLength="3000"
                          disabled={!puedeEditarFormulario}
                          placeholder={`Primera opción\nSegunda opción`}
                          value={campo.opciones.join("\n")}
                          onChange={(evento) => actualizarCampoFormulario(indice, { opciones: evento.target.value.split("\n") })}
                        />
                      </label>
                    )}
                    {puedeEditarFormulario && (
                      <div className="acciones-campo-formulario-evento">
                        <button type="button" disabled={indice === 0} onClick={() => moverCampoFormulario(indice, -1)}>Subir</button>
                        <button type="button" disabled={indice + 1 === camposFormularioEvento.length} onClick={() => moverCampoFormulario(indice, 1)}>Bajar</button>
                        <button className="boton-peligro" type="button" onClick={() => eliminarCampoFormulario(indice)}>Quitar</button>
                      </div>
                    )}
                  </fieldset>
                ))}
                {camposFormularioEvento.length === 0 && <p>No hay requisitos configurados para la inscripción.</p>}
              </div>
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
              <section className="bloque-imagen-evento" aria-labelledby="titulo-imagen-principal-evento">
                <div>
                  <h3 id="titulo-imagen-principal-evento">Imagen principal</h3>
                  <p>Es el póster o portada que identifica el evento.</p>
                </div>
                {eventoEdicion.tieneImagen && <img className="imagen-principal-evento" src={`${eventoEdicion.urlImagen}?version=${eventoEdicion.version}`} alt={`Póster de ${eventoEdicion.titulo}`} />}
                <form onSubmit={subirImagen}><input aria-label="Archivo de imagen principal" name="archivo" type="file" accept="image/png,image/jpeg" required /><button type="submit" disabled={estado.guardando}>Cargar o reemplazar póster</button></form>
                {eventoEdicion.tieneImagen && <button className="boton-peligro" type="button" onClick={quitarImagen}>Eliminar póster</button>}
              </section>
              <section className="bloque-imagen-evento" aria-labelledby="titulo-imagenes-secundarias-evento">
                <div>
                  <h3 id="titulo-imagenes-secundarias-evento">Imágenes secundarias</h3>
                  <p>Complementan el contenido del evento. Puedes agregar hasta 8 imágenes.</p>
                </div>
                <div className="galeria-imagenes-evento-administracion">
                  {imagenesSecundarias.map((imagen, indice) => (
                    <article key={imagen.idImagenEvento}>
                      <img src={imagen.url} alt={`${eventoEdicion.titulo}, imagen secundaria ${indice + 1}`} />
                      <span>{imagen.nombreArchivoOriginal}</span>
                      <button className="boton-peligro" type="button" disabled={estado.guardando} onClick={() => quitarImagenSecundaria(imagen.idImagenEvento)}>Eliminar</button>
                    </article>
                  ))}
                </div>
                {imagenesSecundarias.length === 0 && <p>No hay imágenes secundarias agregadas.</p>}
                <form onSubmit={subirImagenSecundaria}>
                  <input aria-label="Archivo de imagen secundaria" name="archivoSecundario" type="file" accept="image/png,image/jpeg" required />
                  <button type="submit" disabled={estado.guardando || imagenesSecundarias.length >= 8}>Agregar imagen secundaria</button>
                </form>
              </section>
            </div>
          )}
          {!eventoEdicion.idEvento && puedeCrear && (
            <div className="gestion-imagen-evento gestion-imagen-evento-pendiente">
              <section className="bloque-imagen-evento">
                <div>
                  <h3>Imagen principal</h3>
                  <p>Será el póster o portada que identifica el evento.</p>
                </div>
                <p>Guarda primero el evento para habilitar la carga del póster.</p>
              </section>
              <section className="bloque-imagen-evento">
                <div>
                  <h3>Imágenes secundarias</h3>
                  <p>Complementarán el contenido del evento; podrás agregar hasta 8.</p>
                </div>
                <p>Guarda primero el evento para habilitar la galería.</p>
              </section>
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
            <table><thead><tr><th>Persona</th><th>Correo</th><th>Estado</th><th>Requisitos enviados</th><th>Confirmación</th></tr></thead><tbody>{inscripciones.contenido.map((inscripcion) => {
              const respuestas = respuestasInscripcion(inscripcion, camposFormularioEvento);
              return <tr key={inscripcion.idInscripcionEvento}><td>{inscripcion.nombre} {inscripcion.apellido}</td><td>{inscripcion.correo}</td><td>{inscripcion.estado}</td><td>{respuestas.length > 0 ? <details><summary>Ver respuestas</summary><dl className="respuestas-requisitos-evento">{respuestas.map((respuesta) => <div key={respuesta.etiqueta}><dt>{respuesta.etiqueta}</dt><dd>{respuesta.valor}</dd></div>)}</dl></details> : "—"}</td><td>{inscripcion.confirmadaEn ? new Date(inscripcion.confirmadaEn).toLocaleString("es-GT") : "—"}</td></tr>;
            })}</tbody></table>
            {inscripciones.contenido.length === 0 && <p>No hay inscripciones para mostrar.</p>}
          </div>
          <div className="acciones-paginacion"><button type="button" disabled={inscripciones.pagina <= 0} onClick={() => buscarInscripciones(null, inscripciones.pagina - 1)}>Anterior</button><span>Página {inscripciones.totalPaginas === 0 ? 0 : inscripciones.pagina + 1} de {inscripciones.totalPaginas}</span><button type="button" disabled={inscripciones.pagina + 1 >= inscripciones.totalPaginas} onClick={() => buscarInscripciones(null, inscripciones.pagina + 1)}>Siguiente</button></div>
        </section>
      )}
        </div>
      </div>
    </main>
  );
}
