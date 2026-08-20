import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  consultarSolicitudAdministrada,
  iniciarRevisionSolicitud,
  listarSolicitudesAdministradas,
  resolverSolicitud,
} from "../api/administracionSolicitudes";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala",
});

export function PaginaAdministracionSolicitudes() {
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "" });
  const [seleccionada, establecerSeleccionada] = useState(null);
  const [resolucion, establecerResolucion] = useState({ decision: "APROBADA", respuesta: "" });
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  async function cargar(numeroPagina = 0) {
    const respuesta = await listarSolicitudesAdministradas({ ...filtros, pagina: numeroPagina });
    establecerPagina(respuesta);
  }

  useEffect(() => {
    let vigente = true;
    listarSolicitudesAdministradas().then((respuesta) => {
      if (vigente) { establecerPagina(respuesta); establecerEstado((actual) => ({ ...actual, cargando: false })); }
    }).catch((error) => {
      if (vigente) establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message }));
    });
    return () => { vigente = false; };
  }, []);

  async function filtrar(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try { await cargar(0); establecerEstado((actual) => ({ ...actual, cargando: false })); }
    catch (error) { establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message })); }
  }

  async function abrir(idSolicitud) {
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      establecerSeleccionada(await consultarSolicitudAdministrada(idSolicitud));
      establecerResolucion({ decision: "APROBADA", respuesta: "" });
      establecerEstado((actual) => ({ ...actual, cargando: false }));
    } catch (error) { establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message })); }
  }

  async function iniciarRevision() {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizada = await iniciarRevisionSolicitud(seleccionada.idSolicitud, seleccionada.version);
      establecerSeleccionada(actualizada);
      await cargar(pagina.pagina);
      establecerEstado((actual) => ({ ...actual, guardando: false, mensaje: "La solicitud está en revisión." }));
    } catch (error) { establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message })); }
  }

  async function responder(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizada = await resolverSolicitud(
        seleccionada.idSolicitud, resolucion.decision, resolucion.respuesta, seleccionada.version,
      );
      establecerSeleccionada(actualizada);
      await cargar(pagina.pagina);
      establecerEstado((actual) => ({ ...actual, guardando: false, mensaje: "Respuesta registrada y visible para la persona solicitante." }));
    } catch (error) { establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message })); }
  }

  const detalle = seleccionada?.detalle;
  const puedeResolver = seleccionada && ["ENVIADA", "ENREVISION"].includes(seleccionada.estado);

  return (
    <main className="pagina-administracion pagina-administracion-solicitudes">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Solicitudes de instalaciones</h1>
      <p>Revisa los datos, documentos y disponibilidad real antes de aprobar o rechazar una gestión.</p>
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      <section className="panel-edicion panel-listado-administracion" aria-labelledby="titulo-solicitudes-administradas">
        <div className="cabecera-panel-administracion"><div><h2 id="titulo-solicitudes-administradas">Solicitudes recibidas</h2><p>{pagina.totalElementos} solicitudes encontradas.</p></div></div>
        <form className="filtros-administracion" onSubmit={filtrar}>
          <label>Buscar persona<input value={filtros.busqueda} onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option><option value="ENVIADA">Enviada</option><option value="ENREVISION">En revisión</option><option value="APROBADA">Aprobada</option><option value="RECHAZADA">Rechazada</option></select></label>
          <button type="submit" disabled={estado.cargando}>Aplicar</button>
        </form>
        <div className="cabecera-listado-administracion" aria-hidden="true"><span>Solicitud</span><span>Instalación y fecha</span><span>Estado</span></div>
        <div className="lista-elementos-administracion lista-tabular-administracion">
          {pagina.contenido.map((solicitud) => <button type="button" key={solicitud.idSolicitud} className={seleccionada?.idSolicitud === solicitud.idSolicitud ? "seleccionado" : ""} onClick={() => abrir(solicitud.idSolicitud)}><span><strong>Solicitud #{solicitud.idSolicitud}</strong><small>{solicitud.nombreSolicitante}<br />{solicitud.correoSolicitante}</small></span><span><strong>{solicitud.nombreArea}</strong><small>{solicitud.fechaSolicitada}</small></span><span><strong>{formatearTextoTecnico(solicitud.estado)}</strong><small>{formatoFecha.format(new Date(solicitud.actualizadoEn))}</small></span></button>)}
          {!estado.cargando && pagina.contenido.length === 0 && <p>No hay solicitudes para mostrar.</p>}
        </div>
        <div className="acciones-paginacion"><button type="button" disabled={pagina.pagina <= 0} onClick={() => cargar(pagina.pagina - 1)}>Anterior</button><span>Página {pagina.totalPaginas === 0 ? 0 : pagina.pagina + 1} de {pagina.totalPaginas}</span><button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cargar(pagina.pagina + 1)}>Siguiente</button></div>
      </section>

      {seleccionada && <section className="panel-edicion detalle-solicitud-administrada" aria-labelledby="titulo-detalle-solicitud"><div className="cabecera-detalle-solicitud"><div><p className="referencia-solicitud">Solicitud #{seleccionada.idSolicitud}</p><h2 id="titulo-detalle-solicitud">{seleccionada.nombreTipoSolicitud}</h2></div><span className={`estado-solicitud estado-${seleccionada.estado.toLowerCase()}`}>{formatearTextoTecnico(seleccionada.estado)}</span></div>
        <h3>Persona solicitante</h3><dl><div><dt>Nombre</dt><dd>{detalle.datosSolicitante.nombre} {detalle.datosSolicitante.apellido}</dd></div><div><dt>Correo</dt><dd>{detalle.datosSolicitante.correo}</dd></div><div><dt>DPI o CUI</dt><dd>{detalle.datosSolicitante.dpi}</dd></div><div><dt>Celular</dt><dd>{detalle.datosSolicitante.celular}</dd></div></dl>
        <h3>Uso solicitado</h3><dl><div><dt>Instalación</dt><dd>{detalle.nombreArea}</dd></div><div><dt>Fecha</dt><dd>{detalle.fechaSolicitada}</dd></div><div><dt>Horario</dt><dd>{detalle.horaInicio} a {detalle.horaFin}</dd></div><div><dt>Actividad</dt><dd>{detalle.tipoActividad}</dd></div><div><dt>Personas</dt><dd>{detalle.cantidadPersonas}</dd></div><div><dt>Descripción</dt><dd>{detalle.descripcion}</dd></div></dl>
        <div className="comprobacion-disponibilidad"><h3>Comprobación de disponibilidad</h3><p>Consulta el calendario y las reservas internas del parque para esta instalación, fecha y horario. Esta pantalla no crea una reserva automática.</p><Link className="enlace-principal" to="/administracion/areas">Revisar áreas y reservas</Link></div>
        <h3>Documentos</h3><ul className="lista-documentos-solicitud">{seleccionada.documentos.map((documento) => <li key={documento.idSolicitudDocumento}><a href={documento.urlDescarga}>{documento.nombreArchivo}</a><span>{documento.nombreCategoria} · {documento.obligatorio ? "Obligatorio" : "Opcional"}</span></li>)}</ul>{seleccionada.documentos.length === 0 && <p>La persona no adjuntó documentos opcionales.</p>}
        {seleccionada.estado === "ENVIADA" && <button type="button" disabled={estado.guardando} onClick={iniciarRevision}>Marcar en revisión</button>}
        {puedeResolver && <form className="formulario-resolucion-solicitud" onSubmit={responder}><h3>Respuesta u observación</h3><label>Decisión<select value={resolucion.decision} onChange={(evento) => establecerResolucion({ ...resolucion, decision: evento.target.value })}><option value="APROBADA">Aprobar</option><option value="RECHAZADA">Rechazar</option></select></label><label>Respuesta para la persona solicitante<textarea required rows="5" maxLength="5000" value={resolucion.respuesta} onChange={(evento) => establecerResolucion({ ...resolucion, respuesta: evento.target.value })} /></label><button type="submit" disabled={estado.guardando}>Registrar respuesta</button></form>}
        {seleccionada.resolucion && <div className="respuesta-solicitud"><strong>Respuesta registrada</strong><p>{seleccionada.resolucion}</p></div>}
      </section>}
    </main>
  );
}
