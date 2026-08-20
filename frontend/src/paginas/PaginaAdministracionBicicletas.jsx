import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarBicicleta,
  cambiarEstadoBicicleta,
  consultarBicicletaAdministrada,
  crearBicicleta,
  listarBicicletasAdministradas,
  listarHistorialBicicleta,
} from "../api/administracionBicicletas";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const bicicletaVacia = {
  idBicicleta: null,
  codigo: "",
  estado: "DISPONIBLE",
  observacionesInventario: "",
  motivoEstadoInicial: "",
  version: null,
  tienePrestamoActivo: false,
};
const estadosBicicleta = [
  "DISPONIBLE",
  "PRESTADA",
  "ENMANTENIMIENTO",
  "DAÑADA",
  "NODEVUELTA",
  "FUERADESERVICIO",
];
const estadosIniciales = ["DISPONIBLE", "ENMANTENIMIENTO", "DAÑADA", "FUERADESERVICIO"];
const transicionesPorEstado = {
  DISPONIBLE: ["ENMANTENIMIENTO", "DAÑADA", "FUERADESERVICIO"],
  ENMANTENIMIENTO: ["DISPONIBLE", "DAÑADA", "FUERADESERVICIO"],
  DAÑADA: ["ENMANTENIMIENTO", "FUERADESERVICIO"],
  FUERADESERVICIO: ["ENMANTENIMIENTO"],
  PRESTADA: ["NODEVUELTA"],
  NODEVUELTA: [],
};

function generarClaveIdempotencia() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `bicicleta-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function prepararBicicleta(bicicleta) {
  return {
    ...bicicleta,
    observacionesInventario: bicicleta.observacionesInventario || "",
    motivoEstadoInicial: "",
  };
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fecha));
}

export function PaginaAdministracionBicicletas() {
  const { usuario } = usarSesion();
  const puedeCrear = usuario.permisos.includes("BICICLETACREAR");
  const puedeActualizar = usuario.permisos.includes("BICICLETAACTUALIZARESTADO");
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "" });
  const [bicicletaEdicion, establecerBicicletaEdicion] = useState(null);
  const [mostrarListado, establecerMostrarListado] = useState(false);
  const [historial, establecerHistorial] = useState([]);
  const [cambioEstado, establecerCambioEstado] = useState({ estado: "", motivo: "" });
  const [estadoPagina, establecerEstadoPagina] = useState({
    cargando: true,
    guardando: false,
    error: "",
    mensaje: "",
  });
  const claveCreacion = useRef(null);
  const claveCambioEstado = useRef(null);

  async function cargarPagina(parametros = filtros) {
    const respuesta = await listarBicicletasAdministradas(parametros);
    establecerPagina(respuesta);
    return respuesta;
  }

  useEffect(() => {
    let vigente = true;
    listarBicicletasAdministradas()
      .then((respuesta) => {
        if (vigente) {
          establecerPagina(respuesta);
          establecerEstadoPagina({ cargando: false, guardando: false, error: "", mensaje: "" });
        }
      })
      .catch((error) => {
        if (vigente) establecerEstadoPagina({ cargando: false, guardando: false, error: error.message, mensaje: "" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function aplicarFiltros(evento) {
    evento.preventDefault();
    establecerEstadoPagina((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      await cargarPagina(filtros);
      establecerEstadoPagina((actual) => ({ ...actual, cargando: false }));
    } catch (error) {
      establecerEstadoPagina((actual) => ({ ...actual, cargando: false, error: error.message }));
    }
  }

  async function seleccionarBicicleta(bicicleta) {
    establecerMostrarListado(true);
    establecerEstadoPagina((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      const [detalle, cambios] = await Promise.all([
        consultarBicicletaAdministrada(bicicleta.idBicicleta),
        listarHistorialBicicleta(bicicleta.idBicicleta),
      ]);
      establecerBicicletaEdicion(prepararBicicleta(detalle));
      establecerHistorial(cambios);
      establecerCambioEstado({ estado: "", motivo: "" });
      establecerEstadoPagina((actual) => ({ ...actual, cargando: false }));
    } catch (error) {
      establecerEstadoPagina((actual) => ({ ...actual, cargando: false, error: error.message }));
    }
  }

  function nuevaBicicleta() {
    if (bicicletaEdicion && !bicicletaEdicion.idBicicleta) return;
    establecerMostrarListado(false);
    establecerBicicletaEdicion({ ...bicicletaVacia });
    establecerHistorial([]);
    establecerCambioEstado({ estado: "", motivo: "" });
    claveCreacion.current = null;
  }

  function alternarListado() {
    if (mostrarListado) return;
    establecerBicicletaEdicion(null);
    establecerHistorial([]);
    establecerCambioEstado({ estado: "", motivo: "" });
    establecerMostrarListado(true);
  }

  async function guardarInventario(evento) {
    evento.preventDefault();
    establecerEstadoPagina((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      let guardada;
      if (bicicletaEdicion.idBicicleta) {
        guardada = await actualizarBicicleta(bicicletaEdicion.idBicicleta, {
          codigo: bicicletaEdicion.codigo,
          observacionesInventario: bicicletaEdicion.observacionesInventario || null,
          version: bicicletaEdicion.version,
        });
      } else {
        if (!claveCreacion.current) claveCreacion.current = generarClaveIdempotencia();
        guardada = await crearBicicleta({
          codigo: bicicletaEdicion.codigo,
          estadoInicial: bicicletaEdicion.estado,
          observacionesInventario: bicicletaEdicion.observacionesInventario || null,
          motivoEstadoInicial: bicicletaEdicion.motivoEstadoInicial,
        }, claveCreacion.current);
        claveCreacion.current = null;
      }
      establecerBicicletaEdicion(prepararBicicleta(guardada));
      establecerHistorial(await listarHistorialBicicleta(guardada.idBicicleta));
      await cargarPagina(filtros);
      establecerEstadoPagina({ cargando: false, guardando: false, error: "", mensaje: "Bicicleta guardada." });
    } catch (error) {
      establecerEstadoPagina((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  async function guardarCambioEstado(evento) {
    evento.preventDefault();
    establecerEstadoPagina((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      if (!claveCambioEstado.current) claveCambioEstado.current = generarClaveIdempotencia();
      const guardada = await cambiarEstadoBicicleta(bicicletaEdicion.idBicicleta, {
        estado: cambioEstado.estado,
        motivo: cambioEstado.motivo,
        version: bicicletaEdicion.version,
      }, claveCambioEstado.current);
      claveCambioEstado.current = null;
      establecerBicicletaEdicion(prepararBicicleta(guardada));
      establecerHistorial(await listarHistorialBicicleta(guardada.idBicicleta));
      establecerCambioEstado({ estado: "", motivo: "" });
      await cargarPagina(filtros);
      establecerEstadoPagina({ cargando: false, guardando: false, error: "", mensaje: "Estado de la bicicleta actualizado." });
    } catch (error) {
      establecerEstadoPagina((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  const transicionesDisponibles = bicicletaEdicion?.idBicicleta
    ? transicionesPorEstado[bicicletaEdicion.estado] || []
    : [];

  const bicicletaExistenteSeleccionada = Boolean(
    mostrarListado && bicicletaEdicion?.idBicicleta,
  );

  return (
    <main className="pagina-administracion pagina-administracion-bicicletas">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Inventario de bicicletas</h1>
      <p>Registra bicicletas y conserva el historial de cada cambio de estado.</p>
      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Inventario de bicicletas</summary>
      <div className="acciones-superiores-administracion">
        {puedeCrear && <button className={bicicletaEdicion && !bicicletaEdicion.idBicicleta ? "boton-gestion-activo" : ""} type="button" aria-expanded={Boolean(bicicletaEdicion && !bicicletaEdicion.idBicicleta)} onClick={nuevaBicicleta}>Nueva bicicleta</button>}
        <button className={mostrarListado ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarListado} onClick={alternarListado}>Listado de bicicletas</button>
      </div>
          </details>
        </aside>
        <div className="contenido-modulo-administracion">
      {estadoPagina.error && <p className="mensaje-error" role="alert">{estadoPagina.error}</p>}
      {estadoPagina.mensaje && <p className="mensaje-exito" role="status">{estadoPagina.mensaje}</p>}

      {mostrarListado && <section className="panel-edicion panel-listado-administracion" aria-labelledby="titulo-inventario-bicicletas">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-inventario-bicicletas">Bicicletas registradas</h2>
            <p>{pagina.totalElementos} bicicletas encontradas.</p>
          </div>
        </div>
        <form className="filtros-administracion filtros-bicicletas" onSubmit={aplicarFiltros}>
          <label>Buscar<input maxLength="100" value={filtros.busqueda} onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option>{estadosBicicleta.map((valor) => <option key={valor} value={valor}>{formatearTextoTecnico(valor)}</option>)}</select></label>
          <button type="submit" disabled={estadoPagina.cargando}>Aplicar</button>
        </form>
        <div className="cabecera-listado-administracion" aria-hidden="true">
          <span>Código</span><span>Estado</span><span>Actualización</span>
        </div>
        <div className="lista-elementos-administracion lista-bicicletas-administracion lista-tabular-administracion">
          {pagina.contenido.map((bicicleta) => (
            <button
              className={bicicletaEdicion?.idBicicleta === bicicleta.idBicicleta ? "seleccionado" : ""}
              type="button"
              key={bicicleta.idBicicleta}
              aria-expanded={bicicletaEdicion?.idBicicleta === bicicleta.idBicicleta}
              aria-controls={bicicletaEdicion?.idBicicleta === bicicleta.idBicicleta ? "detalle-bicicleta-seleccionada" : undefined}
              onClick={() => seleccionarBicicleta(bicicleta)}
            >
              <span><strong>{bicicleta.codigo}</strong></span>
              <span><strong className="etiqueta-estado">{formatearTextoTecnico(bicicleta.estado)}</strong>{bicicleta.tienePrestamoActivo && <small>Préstamo activo</small>}</span>
              <span><small>Actualizada por {bicicleta.nombreActualizadoPor}</small></span>
            </button>
          ))}
          {!estadoPagina.cargando && pagina.contenido.length === 0 && <p>No hay bicicletas que coincidan con la consulta.</p>}
        </div>
      </section>}

      {bicicletaEdicion && (
        <section
          id={bicicletaExistenteSeleccionada ? "detalle-bicicleta-seleccionada" : undefined}
          className={`panel-edicion${bicicletaExistenteSeleccionada ? " panel-detalle-administracion" : ""}`}
          aria-labelledby="titulo-edicion-bicicleta"
        >
          <h2 id="titulo-edicion-bicicleta">{bicicletaEdicion.idBicicleta ? "Actualizar bicicleta" : "Registrar bicicleta"}</h2>
          {bicicletaEdicion.tienePrestamoActivo && (
            <p className="mensaje-advertencia">Esta bicicleta tiene un préstamo activo. Su estado se mantiene sujeto al flujo de devolución correspondiente.</p>
          )}
          <form className="formulario-administracion formulario-bicicleta" onSubmit={guardarInventario}>
            <label>Código<input required maxLength="64" pattern="[A-Za-z0-9_-]+" value={bicicletaEdicion.codigo} onChange={(evento) => establecerBicicletaEdicion({ ...bicicletaEdicion, codigo: evento.target.value })} /></label>
            {!bicicletaEdicion.idBicicleta && <label>Estado inicial<select value={bicicletaEdicion.estado} onChange={(evento) => establecerBicicletaEdicion({ ...bicicletaEdicion, estado: evento.target.value })}>{estadosIniciales.map((valor) => <option key={valor} value={valor}>{formatearTextoTecnico(valor)}</option>)}</select></label>}
            <label className="campo-ancho-completo">Observaciones del inventario<textarea maxLength="500" value={bicicletaEdicion.observacionesInventario} onChange={(evento) => establecerBicicletaEdicion({ ...bicicletaEdicion, observacionesInventario: evento.target.value })} /></label>
            {!bicicletaEdicion.idBicicleta && <label className="campo-ancho-completo">Motivo del estado inicial<textarea required maxLength="500" value={bicicletaEdicion.motivoEstadoInicial} onChange={(evento) => establecerBicicletaEdicion({ ...bicicletaEdicion, motivoEstadoInicial: evento.target.value })} /></label>}
            {((bicicletaEdicion.idBicicleta && puedeActualizar) || (!bicicletaEdicion.idBicicleta && puedeCrear)) && <button type="submit" disabled={estadoPagina.guardando}>Guardar bicicleta</button>}
          </form>

          {bicicletaEdicion.idBicicleta && puedeActualizar && transicionesDisponibles.length > 0 && (
            <form className="formulario-administracion formulario-cambio-estado" onSubmit={guardarCambioEstado}>
              <h3>Cambiar estado</h3>
              <p>Estado actual: <strong>{formatearTextoTecnico(bicicletaEdicion.estado)}</strong></p>
              <label>Nuevo estado<select required value={cambioEstado.estado} onChange={(evento) => { establecerCambioEstado({ ...cambioEstado, estado: evento.target.value }); claveCambioEstado.current = null; }}><option value="">Selecciona un estado</option>{transicionesDisponibles.map((valor) => <option key={valor} value={valor}>{formatearTextoTecnico(valor)}</option>)}</select></label>
              <label>Motivo<textarea required maxLength="500" value={cambioEstado.motivo} onChange={(evento) => { establecerCambioEstado({ ...cambioEstado, motivo: evento.target.value }); claveCambioEstado.current = null; }} /></label>
              <button type="submit" disabled={estadoPagina.guardando}>Guardar cambio de estado</button>
            </form>
          )}

          {bicicletaEdicion.idBicicleta && (
            <div className="historial-area historial-bicicleta">
              <h3>Historial de estados</h3>
              {historial.length === 0 ? <p>Sin cambios de estado registrados.</p> : (
                <ol>
                  {historial.map((cambio) => (
                    <li key={cambio.idHistorialEstadoBicicleta}>
                      <strong>{formatearTextoTecnico(cambio.estadoAnterior || "INICIAL")} → {formatearTextoTecnico(cambio.estadoNuevo)}</strong>
                      <span>{cambio.motivo} · {cambio.nombreCambiadoPor} · {formatearFecha(cambio.cambiadoEn)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
      )}
        </div>
      </div>
    </main>
  );
}
