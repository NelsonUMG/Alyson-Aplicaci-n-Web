import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  consultarSolicitudAdministrada,
  actualizarPortadaTramite,
  actualizarTramiteAdministrado,
  crearCategoriaTramiteAdministrada,
  crearTramiteAdministrado,
  iniciarRevisionSolicitud,
  listarCategoriasTramitesAdministradas,
  listarCatalogoTramitesAdministrado,
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
  const [categorias, establecerCategorias] = useState([]);
  const [catalogo, establecerCatalogo] = useState([]);
  const [categoriaNueva, establecerCategoriaNueva] = useState(null);
  const [tramiteEdicion, establecerTramiteEdicion] = useState(null);
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  async function cargar(numeroPagina = 0) {
    const respuesta = await listarSolicitudesAdministradas({ ...filtros, pagina: numeroPagina });
    establecerPagina(respuesta);
  }

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarSolicitudesAdministradas(),
      listarCategoriasTramitesAdministradas(),
      listarCatalogoTramitesAdministrado(),
    ]).then(([respuesta, categoriasDisponibles, tramites]) => {
      if (vigente) {
        establecerPagina(respuesta);
        establecerCategorias(categoriasDisponibles);
        establecerCatalogo(tramites);
        establecerEstado((actual) => ({ ...actual, cargando: false }));
      }
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

  function editarTramite(tramite) {
    establecerCategoriaNueva(null);
    establecerTramiteEdicion({ ...tramite, requisitosTexto: tramite.requisitos.join("\n"), documentosTexto: tramite.documentosRequeridos.join("\n") });
  }

  function iniciarCategoriaNueva() {
    establecerTramiteEdicion(null);
    establecerCategoriaNueva({ nombre: "" });
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
  }

  function iniciarTramiteNuevo(idCategoria = categorias[0]?.idCategoria) {
    if (!idCategoria) return;
    establecerCategoriaNueva(null);
    establecerTramiteEdicion({
      idTramite: null,
      idCategoria,
      nombre: "",
      resumen: "",
      acerca: "",
      requisitosTexto: "",
      documentosTexto: "",
      costo: "Sin costo",
      tiempoRespuesta: "Revisión administrativa",
      requiereReserva: false,
      activo: true,
      urlPortada: null,
      version: null,
    });
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
  }

  async function guardarCategoria(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const creada = await crearCategoriaTramiteAdministrada({ nombre: categoriaNueva.nombre });
      establecerCategorias((lista) => [...lista, creada].sort((a, b) => a.ordenVisualizacion - b.ordenVisualizacion));
      iniciarTramiteNuevo(creada.idCategoria);
      establecerEstado((actual) => ({
        ...actual,
        guardando: false,
        mensaje: "Categoría padre creada. Ahora configura su primer trámite hijo.",
      }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  async function guardarTramite(evento) {
    evento.preventDefault(); establecerEstado((a) => ({ ...a, guardando: true, error: "", mensaje: "" }));
    try {
      const datos = {
        idCategoria: tramiteEdicion.idCategoria, nombre: tramiteEdicion.nombre, resumen: tramiteEdicion.resumen,
        acerca: tramiteEdicion.acerca, requisitos: tramiteEdicion.requisitosTexto.split("\n").map((item) => item.trim()).filter(Boolean),
        documentosRequeridos: tramiteEdicion.documentosTexto.split("\n").map((item) => item.trim()).filter(Boolean), costo: tramiteEdicion.costo,
        tiempoRespuesta: tramiteEdicion.tiempoRespuesta, requiereReserva: tramiteEdicion.requiereReserva,
        activo: tramiteEdicion.activo, version: tramiteEdicion.version,
      };
      const esNuevo = tramiteEdicion.idTramite === null;
      const actualizado = esNuevo
        ? await crearTramiteAdministrado(datos)
        : await actualizarTramiteAdministrado(tramiteEdicion.idTramite, datos);
      establecerCatalogo((lista) => esNuevo
        ? [...lista, actualizado]
        : lista.map((item) => item.idTramite === actualizado.idTramite ? actualizado : item));
      editarTramite(actualizado);
      establecerEstado((a) => ({
        ...a,
        guardando: false,
        mensaje: esNuevo ? "Trámite hijo creado y vinculado a su categoría padre." : "Configuración del trámite actualizada.",
      }));
    } catch (error) { establecerEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }

  async function subirPortada(evento) {
    evento.preventDefault(); const formulario = evento.currentTarget;
    establecerEstado((a) => ({ ...a, guardando: true, error: "" }));
    try {
      const actualizado = await actualizarPortadaTramite(tramiteEdicion.idTramite, new window.FormData(formulario).get("archivo"));
      establecerCatalogo((lista) => lista.map((item) => item.idTramite === actualizado.idTramite ? actualizado : item));
      editarTramite(actualizado); formulario.reset(); establecerEstado((a) => ({ ...a, guardando: false, mensaje: "Portada actualizada." }));
    } catch (error) { establecerEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }

  const detalle = seleccionada?.detalle;
  const puedeResolver = seleccionada && ["ENVIADA", "ENREVISION"].includes(seleccionada.estado);
  const catalogoPorCategoria = categorias.map((categoria) => ({
    ...categoria,
    tramites: catalogo.filter((item) => item.idCategoria === categoria.idCategoria),
  }));
  const esDenuncia = seleccionada?.tipoSolicitud === "DENUNCIAQUEJA";

  return (
    <main className="pagina-administracion pagina-administracion-solicitudes">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Solicitudes de instalaciones</h1>
      <p>Revisa los datos, documentos y disponibilidad real antes de aprobar o rechazar una gestión.</p>
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      <section className="panel-edicion configuracion-catalogo-tramites" aria-labelledby="titulo-configuracion-tramites">
        <header className="cabecera-configuracion-catalogo">
          <div>
            <p className="etiqueta-fase">Catálogo de atención</p>
            <h2 id="titulo-configuracion-tramites">Módulo de nuevas solicitudes</h2>
            <p>Crea primero una categoría padre y agrega dentro de ella los trámites hijo que verá la ciudadanía.</p>
          </div>
          <div className="acciones-configuracion-catalogo">
            <button type="button" className="boton-secundario" onClick={iniciarCategoriaNueva}>+ Nueva categoría padre</button>
            <button type="button" disabled={categorias.length === 0} onClick={() => iniciarTramiteNuevo()}>+ Nuevo trámite hijo</button>
          </div>
        </header>

        <div className="administracion-catalogo-columnas">
          <nav className="arbol-catalogo-tramites" aria-label="Categorías padre y trámites hijo configurados">
            <div className="cabecera-arbol-catalogo">
              <strong>Estructura del catálogo</strong>
              <span>{categorias.length} categorías · {catalogo.length} trámites</span>
            </div>
            {catalogoPorCategoria.map((grupoCatalogo) => <section className="grupo-administracion-tramites" key={grupoCatalogo.idCategoria}>
              <header>
                <div><p>Categoría padre</p><h3>{grupoCatalogo.nombre}</h3></div>
                <span>{grupoCatalogo.tramites.length}</span>
              </header>
              <div className="hijos-categoria-tramites">
                {grupoCatalogo.tramites.map((item) => <button
                  type="button"
                  key={item.idTramite}
                  className={tramiteEdicion?.idTramite === item.idTramite ? "seleccionado" : ""}
                  aria-pressed={tramiteEdicion?.idTramite === item.idTramite}
                  onClick={() => editarTramite(item)}
                ><small>Trámite hijo</small><strong>{item.nombre}</strong><span aria-hidden="true">›</span></button>)}
                {grupoCatalogo.tramites.length === 0 && <p className="categoria-sin-tramites">Aún no tiene trámites hijo.</p>}
              </div>
              <button type="button" className="agregar-hijo-categoria" onClick={() => iniciarTramiteNuevo(grupoCatalogo.idCategoria)}>+ Agregar trámite hijo</button>
            </section>)}
            {categorias.length === 0 && <div className="catalogo-administrativo-vacio"><strong>No hay categorías padre</strong><p>Crea la primera para organizar los trámites.</p></div>}
          </nav>

          <div className="editor-catalogo-tramites">
            {categoriaNueva && <form className="formulario-categoria-tramite" onSubmit={guardarCategoria}>
              <div className="cabecera-editor-tramite"><div><p className="etiqueta-fase">Nueva categoría padre</p><h3>Crear categoría</h3><p>Esta categoría agrupará uno o varios trámites hijo.</p></div></div>
              <label>Nombre de la categoría padre<input autoFocus required maxLength="160" placeholder="Ej.: Actividades deportivas" value={categoriaNueva.nombre} onChange={(evento) => establecerCategoriaNueva({ nombre: evento.target.value })} /></label>
              <p className="ayuda-campo-catalogo">El código interno y el orden se generan automáticamente.</p>
              <div className="acciones-editor-catalogo"><button type="button" className="boton-secundario" onClick={() => establecerCategoriaNueva(null)}>Cancelar</button><button type="submit" disabled={estado.guardando}>{estado.guardando ? "Creando…" : "Crear categoría y continuar"}</button></div>
            </form>}

            {tramiteEdicion && <>
              <form onSubmit={guardarTramite} className="formulario-configuracion-tramite">
                <div className="cabecera-editor-tramite">
                  <div><p className="etiqueta-fase">{tramiteEdicion.idTramite === null ? "Nuevo trámite hijo" : "Editar trámite hijo"}</p><h3>{tramiteEdicion.nombre || "Configura el nuevo trámite"}</h3><p>Define cómo aparecerá y qué deberá presentar la persona solicitante.</p></div>
                  {tramiteEdicion.urlPortada && <img src={tramiteEdicion.urlPortada} alt={`Portada actual de ${tramiteEdicion.nombre}`} />}
                </div>

                <fieldset className="seccion-formulario-tramite">
                  <legend>Ubicación e identificación</legend>
                  <p>Todo trámite hijo debe pertenecer a una categoría padre.</p>
                  <div className="rejilla-campos-tramite">
                    <label>Categoría padre<select required value={tramiteEdicion.idCategoria} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, idCategoria: Number(evento.target.value) })}>{categorias.filter((categoria) => categoria.activa).map((categoria) => <option key={categoria.idCategoria} value={categoria.idCategoria}>{categoria.nombre}</option>)}</select></label>
                    <label>Nombre del trámite hijo<input required maxLength="180" placeholder="Ej.: Inscripción a curso de natación" value={tramiteEdicion.nombre} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, nombre: evento.target.value })} /></label>
                  </div>
                  <label>Resumen<textarea required rows="3" maxLength="500" placeholder="Descripción breve para el catálogo ciudadano" value={tramiteEdicion.resumen} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, resumen: evento.target.value })} /></label>
                </fieldset>

                <fieldset className="seccion-formulario-tramite">
                  <legend>Información para la ciudadanía</legend>
                  <label>Acerca de este trámite<textarea required rows="5" maxLength="8000" value={tramiteEdicion.acerca} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, acerca: evento.target.value })} /></label>
                  <div className="rejilla-campos-tramite">
                    <label>Campos y requisitos solicitados <span>Uno por línea</span><textarea required rows="5" value={tramiteEdicion.requisitosTexto} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, requisitosTexto: evento.target.value })} /></label>
                    <label>Documentos solicitados <span>Uno por línea</span><textarea required rows="5" value={tramiteEdicion.documentosTexto} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, documentosTexto: evento.target.value })} /></label>
                  </div>
                </fieldset>

                <fieldset className="seccion-formulario-tramite">
                  <legend>Condiciones y publicación</legend>
                  <div className="rejilla-campos-tramite">
                    <label>Costo<input required maxLength="180" value={tramiteEdicion.costo} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, costo: evento.target.value })} /></label>
                    <label>Tiempo de respuesta<input required maxLength="180" value={tramiteEdicion.tiempoRespuesta} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, tiempoRespuesta: evento.target.value })} /></label>
                  </div>
                  <div className="opciones-publicacion-tramite">
                    <label className="opcion-checkbox"><input type="checkbox" checked={tramiteEdicion.requiereReserva} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, requiereReserva: evento.target.checked })} /><span><strong>Usa el flujo de reserva</strong><small>Solicitará área, fecha y horario.</small></span></label>
                    <label className="opcion-checkbox"><input type="checkbox" checked={tramiteEdicion.activo} onChange={(evento) => establecerTramiteEdicion({ ...tramiteEdicion, activo: evento.target.checked })} /><span><strong>Visible para usuarios</strong><small>Se mostrará en el catálogo público.</small></span></label>
                  </div>
                </fieldset>

                <div className="acciones-editor-catalogo"><button type="button" className="boton-secundario" onClick={() => establecerTramiteEdicion(null)}>Cancelar</button><button type="submit" disabled={estado.guardando}>{estado.guardando ? "Guardando…" : tramiteEdicion.idTramite === null ? "Crear trámite hijo" : "Guardar cambios"}</button></div>
              </form>
              {tramiteEdicion.idTramite !== null && <form className="formulario-portada-tramite" onSubmit={subirPortada}><div><strong>Imagen de portada</strong><p>JPG o PNG para identificar el trámite en el catálogo.</p></div><label>Seleccionar imagen<input name="archivo" type="file" accept="image/png,image/jpeg" required /></label><button disabled={estado.guardando}>Cargar portada</button></form>}
            </>}

            {!categoriaNueva && !tramiteEdicion && <div className="estado-vacio-editor-catalogo"><span aria-hidden="true">▦</span><h3>Selecciona qué deseas configurar</h3><p>Edita un trámite existente o utiliza los botones superiores para crear una categoría padre y sus trámites hijo.</p></div>}
          </div>
        </div>
      </section>

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
        <h3>{esDenuncia ? "Información reportada" : "Uso solicitado"}</h3>{esDenuncia ? <dl><div><dt>Trámite relacionado</dt><dd>{detalle.asunto}</dd></div><div><dt>Descripción</dt><dd>{detalle.descripcion}</dd></div></dl> : <><dl><div><dt>Instalación</dt><dd>{detalle.nombreArea}</dd></div><div><dt>Fecha</dt><dd>{detalle.fechaSolicitada}</dd></div><div><dt>Horario</dt><dd>{detalle.horaInicio} a {detalle.horaFin}</dd></div><div><dt>Actividad</dt><dd>{detalle.tipoActividad}</dd></div><div><dt>Personas</dt><dd>{detalle.cantidadPersonas}</dd></div><div><dt>Descripción</dt><dd>{detalle.descripcion}</dd></div></dl><div className="comprobacion-disponibilidad"><h3>Comprobación de disponibilidad</h3><p>Consulta el calendario y las reservas internas del parque para esta instalación, fecha y horario.</p><Link className="enlace-principal" to="/administracion/areas">Revisar áreas y reservas</Link></div></>}
        <h3>Documentos</h3><ul className="lista-documentos-solicitud">{seleccionada.documentos.map((documento) => <li key={documento.idSolicitudDocumento}><a href={documento.urlDescarga}>{documento.nombreArchivo}</a><span>{documento.nombreCategoria} · {documento.obligatorio ? "Obligatorio" : "Opcional"}</span></li>)}</ul>{seleccionada.documentos.length === 0 && <p>La persona no adjuntó documentos opcionales.</p>}
        {seleccionada.estado === "ENVIADA" && <button type="button" disabled={estado.guardando} onClick={iniciarRevision}>Marcar en revisión</button>}
        {puedeResolver && <form className="formulario-resolucion-solicitud" onSubmit={responder}><h3>Respuesta u observación</h3><label>Decisión<select value={resolucion.decision} onChange={(evento) => establecerResolucion({ ...resolucion, decision: evento.target.value })}><option value="APROBADA">Aprobar</option><option value="RECHAZADA">Rechazar</option></select></label><label>Respuesta para la persona solicitante<textarea required rows="5" maxLength="5000" value={resolucion.respuesta} onChange={(evento) => establecerResolucion({ ...resolucion, respuesta: evento.target.value })} /></label><button type="submit" disabled={estado.guardando}>Registrar respuesta</button></form>}
        {seleccionada.resolucion && <div className="respuesta-solicitud"><strong>Respuesta registrada</strong><p>{seleccionada.resolucion}</p></div>}
      </section>}
    </main>
  );
}
