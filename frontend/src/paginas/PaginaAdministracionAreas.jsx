import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarArea,
  actualizarCategoriaArea,
  actualizarConexionMapa,
  actualizarNodoMapa,
  actualizarReservaArea,
  agregarImagenArea,
  crearArea,
  crearCategoriaArea,
  crearConexionMapa,
  crearNodoMapa,
  crearReservaArea,
  eliminarConexionMapa,
  eliminarImagenArea,
  eliminarNodoMapa,
  listarAreasAdministradas,
  listarCategoriasArea,
  listarConexionesMapa,
  listarHistorialArea,
  listarNodosMapa,
  listarReservasArea,
} from "../api/administracionAreas";
import { usarSesion } from "../autenticacion/ContextoSesion";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const categoriaVacia = { idCategoriaArea: null, codigo: "", nombre: "", descripcion: "", activa: true, version: null };
const areaVacia = {
  idArea: null,
  idCategoriaArea: "",
  codigo: "",
  numeroVisibleMapa: "",
  nombre: "",
  descripcion: "",
  estado: "PENDIENTECONFIRMACION",
  notaDisponibilidad: "",
  latitud: "",
  longitud: "",
  coordenadasConfirmadas: false,
  horarioJson: "",
  observacionesInternas: "",
  motivoCambioEstado: "",
  version: null,
  tieneImagen: false,
  urlImagen: null,
};
const nodoVacio = {
  idNodoMapa: null,
  idArea: "",
  tipoNodo: "INTERSECCION",
  nombre: "",
  latitud: "",
  longitud: "",
  coordenadasConfirmadas: false,
  accesible: true,
  version: null,
};
const conexionVacia = {
  idConexionMapa: null,
  idNodoOrigen: "",
  idNodoDestino: "",
  distanciaMetros: "",
  bidireccional: true,
  accesible: true,
  cerrada: false,
  motivoCierre: "",
  version: null,
};
const reservaVacia = {
  idReservaArea: null,
  titulo: "",
  iniciaEn: "",
  finalizaEn: "",
  estado: "PROGRAMADA",
  observaciones: "",
  version: null,
};
const estadosArea = [
  "PENDIENTECONFIRMACION",
  "DISPONIBLE",
  "ENUSO",
  "ENMANTENIMIENTO",
  "CERRADA",
  "FUERADESERVICIO",
];
const estadosReserva = ["PROGRAMADA", "ENUSO", "FINALIZADA", "CANCELADA"];

function prepararArea(area) {
  return {
    ...area,
    idCategoriaArea: String(area.idCategoriaArea),
    numeroVisibleMapa: area.numeroVisibleMapa ?? "",
    descripcion: area.descripcion || "",
    notaDisponibilidad: area.notaDisponibilidad || "",
    latitud: area.latitud ?? "",
    longitud: area.longitud ?? "",
    horarioJson: area.horarioJson || "",
    observacionesInternas: area.observacionesInternas || "",
    motivoCambioEstado: "",
  };
}

function prepararNodo(nodo) {
  return {
    ...nodo,
    idArea: nodo.idArea ? String(nodo.idArea) : "",
    latitud: nodo.latitud ?? "",
    longitud: nodo.longitud ?? "",
  };
}

function prepararConexion(conexion) {
  return {
    ...conexion,
    idNodoOrigen: String(conexion.idNodoOrigen),
    idNodoDestino: String(conexion.idNodoDestino),
    motivoCierre: conexion.motivoCierre || "",
  };
}

function fechaParaCampo(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  const diferenciaZona = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - diferenciaZona).toISOString().slice(0, 16);
}

function fechaDesdeCampo(valor) {
  return valor ? new Date(valor).toISOString() : null;
}

function prepararReserva(reserva) {
  return {
    ...reserva,
    iniciaEn: fechaParaCampo(reserva.iniciaEn),
    finalizaEn: fechaParaCampo(reserva.finalizaEn),
    observaciones: reserva.observaciones || "",
  };
}

function formatearFechaHora(valor) {
  if (!valor) return "";
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
}

function decimalOpcional(valor) {
  return valor === "" ? null : Number(valor);
}

export function PaginaAdministracionAreas() {
  const { usuario } = usarSesion();
  const puedeActualizar = usuario.permisos.includes("AREAACTUALIZARESTADO");
  const [categorias, establecerCategorias] = useState([]);
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [nodos, establecerNodos] = useState([]);
  const [conexiones, establecerConexiones] = useState([]);
  const [historial, establecerHistorial] = useState([]);
  const [reservas, establecerReservas] = useState([]);
  const [categoriaEdicion, establecerCategoriaEdicion] = useState(categoriaVacia);
  const [areaEdicion, establecerAreaEdicion] = useState(null);
  const [nodoEdicion, establecerNodoEdicion] = useState(nodoVacio);
  const [conexionEdicion, establecerConexionEdicion] = useState(conexionVacia);
  const [reservaEdicion, establecerReservaEdicion] = useState(reservaVacia);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "", idCategoria: "" });
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarCategoriasArea(),
      listarAreasAdministradas(),
      listarNodosMapa(),
      listarConexionesMapa(),
    ]).then(([categoriasCargadas, areasCargadas, nodosCargados, conexionesCargadas]) => {
      if (!vigente) return;
      establecerCategorias(categoriasCargadas);
      establecerPagina(areasCargadas);
      establecerNodos(nodosCargados);
      establecerConexiones(conexionesCargadas);
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

  async function recargarMapa() {
    const [nodosActualizados, conexionesActualizadas] = await Promise.all([
      listarNodosMapa(),
      listarConexionesMapa(),
    ]);
    establecerNodos(nodosActualizados);
    establecerConexiones(conexionesActualizadas);
  }

  async function recargarReservas(idArea) {
    const ahora = new Date();
    const desde = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const hasta = new Date(ahora.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    establecerReservas(await listarReservasArea(idArea, { desde, hasta }));
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

  async function seleccionarArea(area) {
    establecerAreaEdicion(prepararArea(area));
    establecerReservaEdicion(reservaVacia);
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
    try {
      const [historialArea, reservasArea] = await Promise.all([
        listarHistorialArea(area.idArea),
        listarReservasArea(area.idArea),
      ]);
      establecerHistorial(historialArea);
      establecerReservas(reservasArea);
    } catch (error) {
      mostrarError(error);
    }
  }

  async function guardarCategoria(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const guardada = categoriaEdicion.idCategoriaArea
        ? await actualizarCategoriaArea(categoriaEdicion.idCategoriaArea, categoriaEdicion)
        : await crearCategoriaArea(categoriaEdicion);
      establecerCategorias(await listarCategoriasArea());
      establecerCategoriaEdicion({ ...guardada });
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Categoría de área guardada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function guardarArea(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const datos = {
      ...areaEdicion,
      idCategoriaArea: Number(areaEdicion.idCategoriaArea),
      numeroVisibleMapa: areaEdicion.numeroVisibleMapa === "" ? null : Number(areaEdicion.numeroVisibleMapa),
      latitud: decimalOpcional(areaEdicion.latitud),
      longitud: decimalOpcional(areaEdicion.longitud),
      horarioJson: areaEdicion.horarioJson || null,
      motivoCambioEstado: areaEdicion.motivoCambioEstado || null,
    };
    try {
      const guardada = areaEdicion.idArea
        ? await actualizarArea(areaEdicion.idArea, datos)
        : await crearArea(datos);
      establecerAreaEdicion(prepararArea(guardada));
      establecerHistorial(await listarHistorialArea(guardada.idArea));
      await recargarAreas(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Área guardada e historial actualizado." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function guardarReserva(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const datos = {
      ...reservaEdicion,
      iniciaEn: fechaDesdeCampo(reservaEdicion.iniciaEn),
      finalizaEn: fechaDesdeCampo(reservaEdicion.finalizaEn),
      observaciones: reservaEdicion.observaciones || null,
    };
    try {
      const guardada = reservaEdicion.idReservaArea
        ? await actualizarReservaArea(areaEdicion.idArea, reservaEdicion.idReservaArea, datos)
        : await crearReservaArea(areaEdicion.idArea, datos);
      establecerReservaEdicion(prepararReserva(guardada));
      await recargarReservas(areaEdicion.idArea);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Reserva del área guardada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  function prepararNuevaReserva() {
    const inicio = new Date();
    inicio.setMinutes(0, 0, 0);
    inicio.setHours(inicio.getHours() + 1);
    const final = new Date(inicio.getTime() + 60 * 60 * 1000);
    establecerReservaEdicion({
      ...reservaVacia,
      iniciaEn: fechaParaCampo(inicio.toISOString()),
      finalizaEn: fechaParaCampo(final.toISOString()),
    });
  }

  async function subirImagen(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const archivo = new window.FormData(formulario).get("archivo");
    try {
      const actualizada = await agregarImagenArea(areaEdicion.idArea, archivo);
      establecerAreaEdicion(prepararArea(actualizada));
      formulario.reset();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen del área actualizada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function quitarImagen() {
    try {
      establecerAreaEdicion(prepararArea(await eliminarImagenArea(areaEdicion.idArea)));
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen del área eliminada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function guardarNodo(evento) {
    evento.preventDefault();
    const datos = {
      ...nodoEdicion,
      idArea: nodoEdicion.idArea ? Number(nodoEdicion.idArea) : null,
      latitud: decimalOpcional(nodoEdicion.latitud),
      longitud: decimalOpcional(nodoEdicion.longitud),
    };
    try {
      const guardado = nodoEdicion.idNodoMapa
        ? await actualizarNodoMapa(nodoEdicion.idNodoMapa, datos)
        : await crearNodoMapa(datos);
      establecerNodoEdicion(prepararNodo(guardado));
      await recargarMapa();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Nodo del mapa guardado." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function quitarNodo(idNodoMapa) {
    try {
      await eliminarNodoMapa(idNodoMapa);
      establecerNodoEdicion(nodoVacio);
      await recargarMapa();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Nodo del mapa eliminado." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function guardarConexion(evento) {
    evento.preventDefault();
    const datos = {
      ...conexionEdicion,
      idNodoOrigen: Number(conexionEdicion.idNodoOrigen),
      idNodoDestino: Number(conexionEdicion.idNodoDestino),
      distanciaMetros: Number(conexionEdicion.distanciaMetros),
      motivoCierre: conexionEdicion.motivoCierre || null,
    };
    try {
      const guardada = conexionEdicion.idConexionMapa
        ? await actualizarConexionMapa(conexionEdicion.idConexionMapa, datos)
        : await crearConexionMapa(datos);
      establecerConexionEdicion(prepararConexion(guardada));
      await recargarMapa();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Conexión del mapa guardada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function quitarConexion(idConexionMapa) {
    try {
      await eliminarConexionMapa(idConexionMapa);
      establecerConexionEdicion(conexionVacia);
      await recargarMapa();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Conexión del mapa eliminada." });
    } catch (error) {
      mostrarError(error);
    }
  }

  return (
    <main className="pagina-administracion pagina-administracion-areas">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Áreas, instalaciones y mapa</h1>
      <p>Gestiona la información operativa, los estados y los recorridos confirmados del parque.</p>
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      <section className="panel-edicion" aria-labelledby="titulo-areas-administradas">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-areas-administradas">Áreas e instalaciones registradas</h2>
            <p>{pagina.totalElementos} áreas encontradas.</p>
          </div>
          {puedeActualizar && <button type="button" onClick={() => { establecerAreaEdicion({ ...areaVacia }); establecerHistorial([]); establecerReservas([]); establecerReservaEdicion(reservaVacia); }}>Nueva área</button>}
        </div>
        <form className="filtros-administracion" onSubmit={aplicarFiltros}>
          <label>Buscar<input value={filtros.busqueda} onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option>{estadosArea.map((valor) => <option key={valor}>{valor}</option>)}</select></label>
          <label>Categoría<select value={filtros.idCategoria} onChange={(evento) => establecerFiltros({ ...filtros, idCategoria: evento.target.value })}><option value="">Todas</option>{categorias.map((categoria) => <option key={categoria.idCategoriaArea} value={categoria.idCategoriaArea}>{categoria.nombre}</option>)}</select></label>
          <button type="submit" disabled={estado.cargando}>Aplicar</button>
        </form>
        <div className="lista-elementos-administracion">
          {pagina.contenido.map((area) => (
            <button className="elemento-administracion" type="button" key={area.idArea} onClick={() => seleccionarArea(area)}>
              <span><strong>{area.nombre}</strong><small>{area.codigo} · {area.nombreCategoria}</small></span>
              <span className="etiqueta-estado">{area.estado}</span>
            </button>
          ))}
        </div>
      </section>

      {areaEdicion && (
        <section className="panel-edicion" aria-labelledby="titulo-editar-area">
          <h2 id="titulo-editar-area">{areaEdicion.idArea ? "Actualizar área" : "Registrar área"}</h2>
          <form className="formulario-administracion formulario-area" onSubmit={guardarArea}>
            <label>Categoría<select required value={areaEdicion.idCategoriaArea} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, idCategoriaArea: evento.target.value })}><option value="">Selecciona una categoría</option>{categorias.filter((categoria) => categoria.activa || categoria.idCategoriaArea === Number(areaEdicion.idCategoriaArea)).map((categoria) => <option key={categoria.idCategoriaArea} value={categoria.idCategoriaArea}>{categoria.nombre}</option>)}</select></label>
            <label>Código<input required maxLength="64" value={areaEdicion.codigo} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, codigo: evento.target.value })} /></label>
            <label>Número visible del mapa<input type="number" min="1" max="9999" value={areaEdicion.numeroVisibleMapa} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, numeroVisibleMapa: evento.target.value })} /></label>
            <label>Nombre<input required maxLength="150" value={areaEdicion.nombre} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, nombre: evento.target.value })} /></label>
            <label>Estado<select value={areaEdicion.estado} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, estado: evento.target.value })}>{estadosArea.map((valor) => <option key={valor}>{valor}</option>)}</select></label>
            <label>Disponibilidad<input maxLength="300" value={areaEdicion.notaDisponibilidad} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, notaDisponibilidad: evento.target.value })} /></label>
            <label>Latitud<input type="number" step="0.00000001" min="-90" max="90" value={areaEdicion.latitud} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, latitud: evento.target.value })} /></label>
            <label>Longitud<input type="number" step="0.00000001" min="-180" max="180" value={areaEdicion.longitud} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, longitud: evento.target.value })} /></label>
            <label className="campo-verificacion"><input type="checkbox" checked={areaEdicion.coordenadasConfirmadas} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, coordenadasConfirmadas: evento.target.checked })} />Coordenadas confirmadas</label>
            <label>Motivo del estado<input required={!areaEdicion.idArea || areaEdicion.motivoCambioEstado !== ""} maxLength="500" value={areaEdicion.motivoCambioEstado} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, motivoCambioEstado: evento.target.value })} /></label>
            <label className="campo-ancho-completo">Descripción<textarea rows="4" value={areaEdicion.descripcion} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, descripcion: evento.target.value })} /></label>
            <label className="campo-ancho-completo">Horario en JSON<textarea rows="4" value={areaEdicion.horarioJson} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, horarioJson: evento.target.value })} /></label>
            <label className="campo-ancho-completo">Observaciones internas<textarea rows="4" value={areaEdicion.observacionesInternas} onChange={(evento) => establecerAreaEdicion({ ...areaEdicion, observacionesInternas: evento.target.value })} /></label>
            {puedeActualizar && <button type="submit" disabled={estado.guardando}>Guardar área</button>}
          </form>
          {areaEdicion.idArea && puedeActualizar && (
            <div className="panel-imagenes-publicacion">
              <h3>Imagen del área</h3>
              {areaEdicion.urlImagen && <img className="vista-previa-imagen" src={areaEdicion.urlImagen} alt={areaEdicion.nombre} />}
              <form className="formulario-imagen" onSubmit={subirImagen}><label>Archivo PNG o JPEG<input name="archivo" type="file" accept="image/png,image/jpeg" required /></label><button type="submit">Subir imagen</button></form>
              {areaEdicion.tieneImagen && <button className="boton-peligro" type="button" onClick={quitarImagen}>Eliminar imagen</button>}
            </div>
          )}
          {areaEdicion.idArea && (
            <div className="reservas-area">
              <div className="cabecera-panel-administracion">
                <div>
                  <h3>Disponibilidad con reloj</h3>
                  <p>{reservas.length} reservas registradas.</p>
                </div>
                {puedeActualizar && <button type="button" onClick={prepararNuevaReserva}>Nueva reserva</button>}
              </div>
              <div className="rejilla-reservas-area">
                <div className="lista-elementos-administracion">
                  {reservas.length === 0 ? (
                    <p>Sin reservas registradas para esta área.</p>
                  ) : reservas.map((reserva) => (
                    <button className="elemento-administracion" type="button" key={reserva.idReservaArea} onClick={() => establecerReservaEdicion(prepararReserva(reserva))}>
                      <span>
                        <strong>{reserva.titulo}</strong>
                        <small>{formatearFechaHora(reserva.iniciaEn)} → {formatearFechaHora(reserva.finalizaEn)}</small>
                      </span>
                      <span className="etiqueta-estado">{reserva.estado}</span>
                    </button>
                  ))}
                </div>
                {puedeActualizar && (
                  <form className="formulario-administracion formulario-reserva-area" onSubmit={guardarReserva}>
                    <label>Título<input required maxLength="150" value={reservaEdicion.titulo} onChange={(evento) => establecerReservaEdicion({ ...reservaEdicion, titulo: evento.target.value })} /></label>
                    <label>Inicio<input required type="datetime-local" value={reservaEdicion.iniciaEn} onChange={(evento) => establecerReservaEdicion({ ...reservaEdicion, iniciaEn: evento.target.value })} /></label>
                    <label>Finalización<input required type="datetime-local" value={reservaEdicion.finalizaEn} onChange={(evento) => establecerReservaEdicion({ ...reservaEdicion, finalizaEn: evento.target.value })} /></label>
                    <label>Estado<select value={reservaEdicion.estado} onChange={(evento) => establecerReservaEdicion({ ...reservaEdicion, estado: evento.target.value })}>{estadosReserva.map((valor) => <option key={valor}>{valor}</option>)}</select></label>
                    <label className="campo-ancho-completo">Observaciones<textarea rows="3" maxLength="300" value={reservaEdicion.observaciones} onChange={(evento) => establecerReservaEdicion({ ...reservaEdicion, observaciones: evento.target.value })} /></label>
                    <div className="acciones-publicacion">
                      <button type="submit" disabled={estado.guardando}>Guardar reserva</button>
                      {reservaEdicion.idReservaArea && <button type="button" className="boton-secundario" onClick={prepararNuevaReserva}>Limpiar reserva</button>}
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {areaEdicion.idArea && (
            <div className="historial-area">
              <h3>Historial de estados</h3>
              {historial.length === 0 ? <p>Sin cambios de estado registrados.</p> : <ol>{historial.map((cambio) => <li key={cambio.idHistorialEstadoArea}><strong>{cambio.estadoAnterior || "INICIAL"} → {cambio.estadoNuevo}</strong><span>{cambio.motivo} · {cambio.nombreCambiadoPor}</span></li>)}</ol>}
            </div>
          )}
        </section>
      )}

      <section className="panel-edicion" aria-labelledby="titulo-categorias-area">
        <div className="cabecera-panel-administracion"><div><h2 id="titulo-categorias-area">Categorías de áreas</h2><p>Clasificación usada en la información pública.</p></div>{puedeActualizar && <button type="button" onClick={() => establecerCategoriaEdicion({ ...categoriaVacia })}>Nueva categoría</button>}</div>
        <div className="rejilla-categorias-administracion">
          <div className="lista-elementos-administracion">{categorias.map((categoria) => <button className="elemento-administracion" type="button" key={categoria.idCategoriaArea} onClick={() => establecerCategoriaEdicion({ ...categoria })}><span><strong>{categoria.nombre}</strong><small>{categoria.codigo}</small></span><span className="etiqueta-estado">{categoria.activa ? "ACTIVA" : "INACTIVA"}</span></button>)}</div>
          <form className="formulario-administracion" onSubmit={guardarCategoria}>
            <label>Código<input required maxLength="64" value={categoriaEdicion.codigo} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, codigo: evento.target.value })} /></label>
            <label>Nombre<input required maxLength="100" value={categoriaEdicion.nombre} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, nombre: evento.target.value })} /></label>
            <label>Descripción<textarea maxLength="300" value={categoriaEdicion.descripcion || ""} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, descripcion: evento.target.value })} /></label>
            <label className="campo-verificacion"><input type="checkbox" checked={categoriaEdicion.activa} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, activa: evento.target.checked })} />Categoría activa</label>
            {puedeActualizar && <button type="submit">Guardar categoría</button>}
          </form>
        </div>
      </section>

      <section className="panel-edicion" aria-labelledby="titulo-grafo-mapa">
        <h2 id="titulo-grafo-mapa">Grafo de recorridos confirmados</h2>
        <p>Las rutas se calculan únicamente con nodos y conexiones registrados.</p>
        <div className="rejilla-mapa-administracion">
          <div>
            <div className="cabecera-panel-administracion"><h3>Nodos</h3>{puedeActualizar && <button type="button" onClick={() => establecerNodoEdicion({ ...nodoVacio })}>Nuevo nodo</button>}</div>
            <div className="lista-elementos-administracion">{nodos.map((nodo) => <button className="elemento-administracion" type="button" key={nodo.idNodoMapa} onClick={() => establecerNodoEdicion(prepararNodo(nodo))}><span><strong>{nodo.nombre}</strong><small>{nodo.tipoNodo}{nodo.nombreArea ? ` · ${nodo.nombreArea}` : ""}</small></span><span className="etiqueta-estado">{nodo.coordenadasConfirmadas ? "CONFIRMADO" : "PENDIENTE"}</span></button>)}</div>
            <form className="formulario-administracion formulario-mapa" onSubmit={guardarNodo}>
              <label>Tipo<select value={nodoEdicion.tipoNodo} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, tipoNodo: evento.target.value })}><option>ENTRADA</option><option>INTERSECCION</option><option>DESTINO</option></select></label>
              <label>Área<select value={nodoEdicion.idArea} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, idArea: evento.target.value })}><option value="">Sin área</option>{pagina.contenido.map((area) => <option key={area.idArea} value={area.idArea}>{area.nombre}</option>)}</select></label>
              <label>Nombre<input required maxLength="150" value={nodoEdicion.nombre} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, nombre: evento.target.value })} /></label>
              <label>Latitud<input type="number" step="0.00000001" min="-90" max="90" value={nodoEdicion.latitud} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, latitud: evento.target.value })} /></label>
              <label>Longitud<input type="number" step="0.00000001" min="-180" max="180" value={nodoEdicion.longitud} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, longitud: evento.target.value })} /></label>
              <label className="campo-verificacion"><input type="checkbox" checked={nodoEdicion.coordenadasConfirmadas} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, coordenadasConfirmadas: evento.target.checked })} />Coordenadas confirmadas</label>
              <label className="campo-verificacion"><input type="checkbox" checked={nodoEdicion.accesible} onChange={(evento) => establecerNodoEdicion({ ...nodoEdicion, accesible: evento.target.checked })} />Nodo accesible</label>
              {puedeActualizar && <div className="acciones-publicacion"><button type="submit">Guardar nodo</button>{nodoEdicion.idNodoMapa && <button className="boton-peligro" type="button" onClick={() => quitarNodo(nodoEdicion.idNodoMapa)}>Eliminar nodo</button>}</div>}
            </form>
          </div>
          <div>
            <div className="cabecera-panel-administracion"><h3>Conexiones</h3>{puedeActualizar && <button type="button" onClick={() => establecerConexionEdicion({ ...conexionVacia })}>Nueva conexión</button>}</div>
            <div className="lista-elementos-administracion">{conexiones.map((conexion) => <button className="elemento-administracion" type="button" key={conexion.idConexionMapa} onClick={() => establecerConexionEdicion(prepararConexion(conexion))}><span><strong>{conexion.nombreNodoOrigen} → {conexion.nombreNodoDestino}</strong><small>{conexion.distanciaMetros} metros</small></span><span className="etiqueta-estado">{conexion.cerrada ? "CERRADA" : "ABIERTA"}</span></button>)}</div>
            <form className="formulario-administracion formulario-mapa" onSubmit={guardarConexion}>
              <label>Origen<select required value={conexionEdicion.idNodoOrigen} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, idNodoOrigen: evento.target.value })}><option value="">Selecciona un nodo</option>{nodos.map((nodo) => <option key={nodo.idNodoMapa} value={nodo.idNodoMapa}>{nodo.nombre}</option>)}</select></label>
              <label>Destino<select required value={conexionEdicion.idNodoDestino} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, idNodoDestino: evento.target.value })}><option value="">Selecciona un nodo</option>{nodos.map((nodo) => <option key={nodo.idNodoMapa} value={nodo.idNodoMapa}>{nodo.nombre}</option>)}</select></label>
              <label>Distancia en metros<input required type="number" min="0.01" step="0.01" value={conexionEdicion.distanciaMetros} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, distanciaMetros: evento.target.value })} /></label>
              <label className="campo-verificacion"><input type="checkbox" checked={conexionEdicion.bidireccional} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, bidireccional: evento.target.checked })} />Conexión bidireccional</label>
              <label className="campo-verificacion"><input type="checkbox" checked={conexionEdicion.accesible} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, accesible: evento.target.checked })} />Conexión accesible</label>
              <label className="campo-verificacion"><input type="checkbox" checked={conexionEdicion.cerrada} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, cerrada: evento.target.checked })} />Conexión cerrada</label>
              <label>Motivo de cierre<input maxLength="300" value={conexionEdicion.motivoCierre} onChange={(evento) => establecerConexionEdicion({ ...conexionEdicion, motivoCierre: evento.target.value })} /></label>
              {puedeActualizar && <div className="acciones-publicacion"><button type="submit">Guardar conexión</button>{conexionEdicion.idConexionMapa && <button className="boton-peligro" type="button" onClick={() => quitarConexion(conexionEdicion.idConexionMapa)}>Eliminar conexión</button>}</div>}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
