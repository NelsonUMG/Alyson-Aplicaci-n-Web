import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarArea,
  actualizarCategoriaArea,
  agregarImagenArea,
  crearArea,
  crearCategoriaArea,
  eliminarArea,
  listarAreasAdministradas,
  listarCategoriasArea,
} from "../api/administracionAreas";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { EditorPerimetroArea } from "../componentes/EditorPerimetroArea";
import { SelectorHorarioArea } from "../componentes/SelectorHorarioArea";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const categoriaVacia = { idCategoriaArea: null, nombre: "", descripcion: "", activa: true, version: null };
const areaVacia = {
  idArea: null,
  idCategoriaArea: "",
  numeroVisibleMapa: "",
  nombre: "",
  descripcion: "",
  estado: "PENDIENTECONFIRMACION",
  estadoOriginal: null,
  perimetro: [],
  horarioJson: "",
  periodosHorario: [],
  horarioModificado: false,
  horarioFormatoAnterior: false,
  observacionesInternas: "",
  motivoCambioEstado: "",
  version: null,
  tieneImagen: false,
  urlImagen: null,
};
const estadosArea = [
  "PENDIENTECONFIRMACION",
  "DISPONIBLE",
  "ENUSO",
  "ENMANTENIMIENTO",
  "CERRADA",
  "FUERADESERVICIO",
];
const etiquetasEstadoArea = {
  PENDIENTECONFIRMACION: "Pendiente de confirmación",
  DISPONIBLE: "Disponible",
  ENUSO: "En uso",
  ENMANTENIMIENTO: "En mantenimiento",
  CERRADA: "Cerrada",
  FUERADESERVICIO: "Fuera de servicio",
};

function etiquetaEstadoArea(estado) {
  return etiquetasEstadoArea[estado] || estado;
}

function prepararArea(area) {
  const horario = prepararHorario(area.horarioJson);
  return {
    ...area,
    idCategoriaArea: String(area.idCategoriaArea),
    numeroVisibleMapa: area.numeroVisibleMapa ?? "",
    descripcion: area.descripcion || "",
    estadoOriginal: area.estado,
    perimetro: area.perimetro || [],
    horarioJson: area.horarioJson || "",
    periodosHorario: horario.periodos,
    horarioModificado: false,
    horarioFormatoAnterior: horario.formatoAnterior,
    observacionesInternas: area.observacionesInternas || "",
    motivoCambioEstado: "",
  };
}

function prepararHorario(horarioJson) {
  if (!horarioJson) return { periodos: [], formatoAnterior: false };
  try {
    const contenido = JSON.parse(horarioJson);
    if (!contenido || !Array.isArray(contenido.periodos)) {
      return { periodos: [], formatoAnterior: true };
    }
    const periodos = contenido.periodos.filter((periodo) => (
      Array.isArray(periodo.dias)
      && periodo.dias.length > 0
      && typeof periodo.abre === "string"
      && typeof periodo.cierra === "string"
    ));
    return { periodos, formatoAnterior: periodos.length !== contenido.periodos.length };
  } catch {
    return { periodos: [], formatoAnterior: true };
  }
}

function serializarHorario(area) {
  if (area.horarioModificado) {
    return area.periodosHorario.length > 0
      ? JSON.stringify({ periodos: area.periodosHorario })
      : null;
  }
  if (!area.horarioJson) return null;
  try {
    const contenido = JSON.parse(area.horarioJson);
    return contenido && typeof contenido === "object" && !Array.isArray(contenido)
      ? area.horarioJson
      : null;
  } catch {
    return null;
  }
}

export function PaginaAdministracionAreas() {
  const { usuario } = usarSesion();
  const puedeActualizar = usuario.permisos.includes("AREAACTUALIZARESTADO");
  const puedeEliminar = usuario.permisos.includes("AREAELIMINAR");
  const [categorias, establecerCategorias] = useState([]);
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [categoriaEdicion, establecerCategoriaEdicion] = useState(categoriaVacia);
  const [mostrarCategorias, establecerMostrarCategorias] = useState(false);
  const [areaEdicion, establecerAreaEdicion] = useState(null);
  const [mostrarListado, establecerMostrarListado] = useState(false);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "", idCategoria: "" });
  const [imagenAreaPendiente, establecerImagenAreaPendiente] = useState(null);
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarCategoriasArea(),
      listarAreasAdministradas(),
    ]).then(([categoriasCargadas, areasCargadas]) => {
      if (!vigente) return;
      establecerCategorias(categoriasCargadas);
      establecerPagina(areasCargadas);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    }).catch((error) => {
      if (vigente) establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    });
    return () => {
      vigente = false;
    };
  }, []);

  async function recargarAreas(numeroPagina = 0) {
    establecerPagina(await listarAreasAdministradas({ ...filtros, pagina: numeroPagina }));
  }

  function mostrarError(error) {
    establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
  }

  async function aplicarFiltros(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      await recargarAreas();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      mostrarError(error);
    }
  }

  function seleccionarArea(area) {
    establecerMostrarCategorias(false);
    establecerMostrarListado(true);
    establecerAreaEdicion(prepararArea(area));
    establecerImagenAreaPendiente(null);
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
  }

  async function guardarCategoria(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const datos = {
        nombre: categoriaEdicion.nombre,
        descripcion: categoriaEdicion.descripcion || null,
        activa: categoriaEdicion.activa,
        version: categoriaEdicion.version,
      };
      const guardada = categoriaEdicion.idCategoriaArea
        ? await actualizarCategoriaArea(categoriaEdicion.idCategoriaArea, datos)
        : await crearCategoriaArea(datos);
      establecerCategorias(await listarCategoriasArea());
      establecerCategoriaEdicion({ ...guardada });
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Categoría de área guardada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function guardarArea(evento) {
    evento.preventDefault();
    if (!areaEdicion.tieneImagen && !imagenAreaPendiente) {
      establecerEstado((actual) => ({ ...actual, error: "La imagen principal del área es obligatoria.", mensaje: "" }));
      return;
    }
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const datos = {
      idCategoriaArea: Number(areaEdicion.idCategoriaArea),
      numeroVisibleMapa: areaEdicion.numeroVisibleMapa === "" ? null : Number(areaEdicion.numeroVisibleMapa),
      nombre: areaEdicion.nombre,
      descripcion: areaEdicion.descripcion || null,
      estado: areaEdicion.estado,
      horarioJson: serializarHorario(areaEdicion),
      observacionesInternas: areaEdicion.observacionesInternas || null,
      motivoCambioEstado: areaEdicion.motivoCambioEstado || null,
      perimetro: areaEdicion.perimetro.map((vertice) => ({
        latitud: Number(vertice.latitud),
        longitud: Number(vertice.longitud),
      })),
      version: areaEdicion.version,
    };
    let guardada = null;
    try {
      guardada = areaEdicion.idArea
        ? await actualizarArea(areaEdicion.idArea, datos)
        : await crearArea(datos);
      establecerAreaEdicion(prepararArea(guardada));
      if (imagenAreaPendiente) {
        guardada = await agregarImagenArea(guardada.idArea, imagenAreaPendiente);
        establecerImagenAreaPendiente(null);
      }
      establecerAreaEdicion(prepararArea(guardada));
      await recargarAreas(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Área guardada." });
    } catch (error) {
      if (guardada) establecerAreaEdicion(prepararArea(guardada));
      mostrarError(error);
    }
  }

  async function eliminarAreaSeleccionada() {
    const confirmada = window.confirm(
      "¿Eliminar esta área definitivamente? Esta acción no se puede deshacer.",
    );
    if (!confirmada) return;
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await eliminarArea(areaEdicion.idArea, areaEdicion.version);
      establecerAreaEdicion(null);
      await recargarAreas(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Área eliminada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  function alternarCategorias() {
    if (mostrarCategorias) return;
    establecerAreaEdicion(null);
    establecerImagenAreaPendiente(null);
    establecerMostrarListado(false);
    establecerMostrarCategorias(true);
  }

  function alternarArea() {
    if (areaEdicion && !areaEdicion.idArea) return;
    const primeraCategoria = categorias.find((categoria) => categoria.activa);
    if (!primeraCategoria) {
      establecerEstado((actual) => ({
        ...actual,
        error: "Primero debes crear al menos una categoría activa para registrar áreas.",
        mensaje: "",
      }));
      return;
    }
    establecerMostrarCategorias(false);
    establecerMostrarListado(false);
    establecerAreaEdicion({ ...areaVacia, idCategoriaArea: primeraCategoria.idCategoriaArea });
    establecerImagenAreaPendiente(null);
  }

  function alternarListado() {
    if (mostrarListado) return;
    establecerMostrarCategorias(false);
    establecerAreaEdicion(null);
    establecerImagenAreaPendiente(null);
    establecerMostrarListado(true);
  }

  const categoriasActivas = categorias.filter((categoria) => categoria.activa);
  const nuevaAreaNoDisponible = estado.cargando || categoriasActivas.length === 0;
  const nuevaAreaActiva = Boolean(areaEdicion && !areaEdicion.idArea);
  const areaExistenteSeleccionada = Boolean(mostrarListado && areaEdicion?.idArea);

  return (
    <main className="pagina-administracion pagina-administracion-areas">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <div className="encabezado-gestion-areas">
        <h1>Áreas del parque</h1>
        <p>Gestiona las categorías, las áreas y su información para el mapa público.</p>
      </div>
      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Áreas del parque</summary>
        <div className="acciones-superiores-areas">
          <button
            className={mostrarCategorias ? "boton-gestion-activo" : "boton-secundario"}
            type="button"
            aria-expanded={mostrarCategorias}
            onClick={alternarCategorias}
          >
            Categorías
          </button>
          {puedeActualizar && (
            <button
              className={nuevaAreaActiva ? "boton-gestion-activo" : ""}
              type="button"
              aria-expanded={nuevaAreaActiva}
              aria-describedby={categoriasActivas.length === 0 ? "aviso-sin-categorias-area" : undefined}
              disabled={nuevaAreaNoDisponible}
              onClick={alternarArea}
            >
              Nueva área
            </button>
          )}
          <button
            className={mostrarListado ? "boton-gestion-activo" : "boton-secundario"}
            type="button"
            aria-expanded={mostrarListado}
            onClick={alternarListado}
          >
            Listado de áreas
          </button>
        </div>
          </details>
        </aside>
        <div className="contenido-modulo-administracion">
        {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
        {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
        {!estado.cargando && categoriasActivas.length === 0 && (
          <p id="aviso-sin-categorias-area" className="nota-formulario-administracion" role="status">
            Primero crea al menos una categoría activa para poder registrar áreas.
          </p>
        )}

      {(mostrarCategorias || areaEdicion) && <div className={`disposicion-principal-areas${mostrarCategorias && areaEdicion ? "" : " un-panel"}${areaExistenteSeleccionada ? " detalle-area-seleccionada" : ""}`}>
      {mostrarCategorias && (
        <section className="panel-edicion panel-categorias-area" aria-labelledby="titulo-categorias-area">
          <div className="cabecera-panel-administracion"><div><h2 id="titulo-categorias-area">Categorías de áreas</h2><p>Clasificación usada en la información pública.</p></div></div>
          <div className="rejilla-categorias-administracion compacta">
            <form className="formulario-administracion" onSubmit={guardarCategoria}>
              <label>Seleccionar categoría existente<select value={categoriaEdicion.idCategoriaArea || ""} onChange={(evento) => {
                const seleccionada = categorias.find((categoria) => categoria.idCategoriaArea === Number(evento.target.value));
                establecerCategoriaEdicion(seleccionada ? { ...seleccionada } : { ...categoriaVacia });
              }}><option value="">Nueva categoría</option>{categorias.map((categoria) => <option key={categoria.idCategoriaArea} value={categoria.idCategoriaArea}>{categoria.nombre}{categoria.activa ? "" : " (inactiva)"}</option>)}</select></label>
              <label>Nombre<input required maxLength="100" value={categoriaEdicion.nombre} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, nombre: evento.target.value })} /></label>
              <label>Descripción <span className="indicador-opcional">(opcional)</span><textarea maxLength="300" value={categoriaEdicion.descripcion || ""} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, descripcion: evento.target.value })} /></label>
              <label className="campo-verificacion"><input type="checkbox" checked={categoriaEdicion.activa} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, activa: evento.target.checked })} />Categoría activa</label>
              {puedeActualizar && <button type="submit">Guardar categoría</button>}
            </form>
          </div>
        </section>
      )}

      {areaEdicion && (
        <section
          id={areaExistenteSeleccionada ? "detalle-area-seleccionada" : undefined}
          className={`panel-edicion panel-editor-area${areaExistenteSeleccionada ? " panel-detalle-area" : ""}`}
          aria-labelledby="titulo-editar-area"
        >
          <h2 id="titulo-editar-area">{areaEdicion.idArea ? "Actualizar área" : "Registrar área"}</h2>
          <form className="formulario-administracion formulario-area" onSubmit={guardarArea}>
            <label>Categoría<select required value={areaEdicion.idCategoriaArea} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, idCategoriaArea: evento.target.value })}><option value="">Selecciona una categoría</option>{categorias.filter((categoria) => categoria.activa || categoria.idCategoriaArea === Number(areaEdicion.idCategoriaArea)).map((categoria) => <option key={categoria.idCategoriaArea} value={categoria.idCategoriaArea}>{categoria.nombre}</option>)}</select></label>
            <label>Número visible del mapa <span className="indicador-opcional">(opcional)</span><input type="number" min="1" max="9999" value={areaEdicion.numeroVisibleMapa} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, numeroVisibleMapa: evento.target.value })} /></label>
            <label>Nombre<input required maxLength="150" value={areaEdicion.nombre} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, nombre: evento.target.value })} /></label>
            <label>Estado<select value={areaEdicion.estado} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, estado: evento.target.value })}>{estadosArea.map((valor) => <option key={valor} value={valor}>{etiquetaEstadoArea(valor)}</option>)}</select></label>
            <div className="campo-ancho-completo">
              <div className="etiqueta-bloque-formulario">Perímetro <span className="indicador-opcional">(opcional)</span></div>
              <EditorPerimetroArea
                perimetro={areaEdicion.perimetro}
                alCambiar={(cambio) => establecerAreaEdicion((actual) => ({
                  ...actual,
                  perimetro: typeof cambio === "function" ? cambio(actual.perimetro) : cambio,
                }))}
              />
            </div>
            <label>Motivo del estado {areaEdicion.idArea && areaEdicion.estado === areaEdicion.estadoOriginal && <span className="indicador-opcional">(opcional)</span>}<input required={!areaEdicion.idArea || areaEdicion.estado !== areaEdicion.estadoOriginal} maxLength="500" value={areaEdicion.motivoCambioEstado} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, motivoCambioEstado: evento.target.value })} /></label>
            <label className="campo-ancho-completo">Descripción <span className="indicador-opcional">(opcional)</span><textarea rows="4" value={areaEdicion.descripcion} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, descripcion: evento.target.value })} /></label>
            <div className="campo-ancho-completo">
              <SelectorHorarioArea
                periodos={areaEdicion.periodosHorario}
                formatoAnterior={areaEdicion.horarioFormatoAnterior}
                alCambiar={(periodosHorario) => establecerAreaEdicion({
                  ...areaEdicion,
                  periodosHorario,
                  horarioModificado: true,
                  horarioFormatoAnterior: false,
                })}
              />
            </div>
            <label className="campo-ancho-completo">Observaciones internas <span className="indicador-opcional">(opcional)</span><textarea rows="4" value={areaEdicion.observacionesInternas} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, observacionesInternas: evento.target.value })} /></label>
            <div className="gestion-imagen-area campo-ancho-completo">
              <h3>Imagen principal</h3>
              <p>Obligatoria para que el área se muestre completa en Áreas y servicios.</p>
              {areaEdicion.tieneImagen && <img src={`${areaEdicion.urlImagen}?version=${areaEdicion.version}`} alt={areaEdicion.nombre} />}
              <label>{areaEdicion.tieneImagen ? "Reemplazar imagen (opcional)" : "Seleccionar imagen"}<input type="file" accept="image/png,image/jpeg" required={!areaEdicion.tieneImagen} onChange={(evento) => establecerImagenAreaPendiente(evento.target.files?.[0] || null)} /></label>
              {imagenAreaPendiente && <small>Archivo seleccionado: {imagenAreaPendiente.name}</small>}
            </div>
            <div className="acciones-area campo-ancho-completo">
              {puedeActualizar && <button type="submit" disabled={estado.guardando}>Guardar área</button>}
              {puedeEliminar && areaEdicion.idArea && (
                <button
                  className="boton-peligro boton-eliminar-area"
                  type="button"
                  disabled={estado.guardando}
                  onClick={eliminarAreaSeleccionada}
                >
                  Eliminar área
                </button>
              )}
            </div>
          </form>
        </section>
      )}
      </div>}

      {mostrarListado && <section className="panel-edicion panel-listado-areas" aria-labelledby="titulo-areas-administradas">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-areas-administradas">Áreas registradas</h2>
            <p>{pagina.totalElementos} áreas encontradas.</p>
          </div>
        </div>
        <form className="filtros-administracion" onSubmit={aplicarFiltros}>
          <label>Buscar<input value={filtros.busqueda} onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option>{estadosArea.map((valor) => <option key={valor} value={valor}>{etiquetaEstadoArea(valor)}</option>)}</select></label>
          <label>Categoría<select value={filtros.idCategoria} onChange={(evento) => establecerFiltros({ ...filtros, idCategoria: evento.target.value })}><option value="">Todas</option>{categorias.map((categoria) => <option key={categoria.idCategoriaArea} value={categoria.idCategoriaArea}>{categoria.nombre}</option>)}</select></label>
          <button type="submit" disabled={estado.cargando}>Aplicar</button>
        </form>
        <div className="cabecera-listado-areas" aria-hidden="true">
          <span>Área</span>
          <span>Código y categoría</span>
          <span>Estado</span>
        </div>
        <div className="lista-elementos-administracion lista-areas-administracion">
          {pagina.contenido.map((area) => (
            <button
              className={`elemento-administracion tarjeta-area${areaEdicion?.idArea === area.idArea ? " seleccionado" : ""}`}
              type="button"
              key={area.idArea}
              aria-expanded={areaEdicion?.idArea === area.idArea}
              aria-controls={areaEdicion?.idArea === area.idArea ? "detalle-area-seleccionada" : undefined}
              onClick={() => seleccionarArea(area)}
            >
              <span><strong>{area.nombre}</strong></span>
              <span><strong>{area.codigo}</strong><small>{area.nombreCategoria}</small></span>
              <span className="etiqueta-estado">{etiquetaEstadoArea(area.estado)}</span>
            </button>
          ))}
        </div>
      </section>}

        </div>
      </div>
    </main>
  );
}
