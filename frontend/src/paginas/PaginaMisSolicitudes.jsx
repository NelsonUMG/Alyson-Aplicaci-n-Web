import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/solicitudes";
import { listarAreas } from "../api/portalPublico";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const grupos = [
  { codigo: "BORRADORES", etiqueta: "Borradores", conteo: "borradores", icono: "✎" },
  { codigo: "ENPROCESO", etiqueta: "En proceso", conteo: "enProceso", icono: "◷" },
  { codigo: "FINALIZADAS", etiqueta: "Finalizadas", conteo: "finalizadas", icono: "✓" },
];
const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
  conteos: { borradores: 0, enProceso: 0, finalizadas: 0, rechazadas: 0 } };
const mensajesVacios = {
  TODOS: "No tienes solicitudes registradas.",
  BORRADORES: "No tienes solicitudes guardadas como borrador.", ENPROCESO: "No tienes solicitudes enviadas o en revisión.",
  FINALIZADAS: "No tienes solicitudes finalizadas.",
};
const aspiranteVacio = { nombreCompleto: "", dpi: "", telefono: "", correo: "", representanteLegal: false, institucion: "" };
const espacioVacio = { codigoArea: "", fechaSolicitada: "", horaInicio: "", horaFin: "", tipoActividad: "",
  cantidadPersonas: 51, descripcion: "", tipoReserva: "", nombreResponsable: "" };
const denunciaVacia = { codigoTramite: "", descripcion: "" };
const CODIGO_DENUNCIAS_QUEJAS = "DENUNCIASQUEJAS";
const TAMANO_MAXIMO_DPI = 20 * 1024 * 1024;
const formatoFecha = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" });
const formatoFechaCorta = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeZone: "America/Guatemala" });

function Pasos({ paso }) {
  return <ol className="pasos-solicitud pasos-solicitud-amplios" aria-label="Progreso de la solicitud">
    {["Información del solicitante", "Información del espacio", "Carga de documentos"].map((nombre, indice) => <li key={nombre} className={paso === indice + 1 ? "activo" : paso > indice + 1 ? "completado" : ""}><span>{indice + 1}</span>{nombre}</li>)}
  </ol>;
}

function Estrellas({ valor, onChange, lectura = false }) {
  return <span className="estrellas-tramite" aria-label={`${valor} de 5 estrellas`}>{[1, 2, 3, 4, 5].map((numero) => lectura
    ? <span key={numero} className={numero <= valor ? "marcada" : ""}>★</span>
    : <button key={numero} type="button" className={numero <= valor ? "marcada" : ""} onClick={() => onChange(numero)} aria-label={`${numero} estrellas`}>★</button>)}</span>;
}

function tiempoRelativo(fecha) {
  const horas = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 3600000));
  if (horas < 1) return "Hace menos de una hora";
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "Ayer" : `Hace ${dias} días`;
}

function IconoPanel({ tipo }) {
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (tipo === "inicio") return <svg {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
  if (tipo === "nueva") return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
  if (tipo === "borrador") return <svg {...props}><path d="M4 19.5V20h.5L17.8 6.7l-1.5-1.5-1.5-1.5L4 14.5v5Z" /><path d="m13.8 4.7 3 3M8 20h12" /></svg>;
  if (tipo === "proceso") return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
  if (tipo === "finalizada") return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.3 2.3 4.8-5" /></svg>;
  if (tipo === "rechazada") return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="M12 8v5M12 16h.01" /></svg>;
  if (tipo === "perfil") return <svg {...props}><circle cx="12" cy="8" r="3" /><path d="M5 20c.7-4.2 3.1-6 7-6s6.3 1.8 7 6" /></svg>;
  if (tipo === "ayuda") return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.8-2.2 2-2.2 3.5M12 17h.01" /></svg>;
  if (tipo === "campana") return <svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
  if (tipo === "filtro") return <svg {...props}><path d="M4 5h16l-6.4 7.2V18l-3.2 1.6v-7.4Z" /></svg>;
  if (tipo === "buscar") return <svg {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></svg>;
  if (tipo === "auriculares") return <svg {...props}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 14h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2ZM17 20c0 1-1 2-3 2" /></svg>;
  if (tipo === "portapapeles") return <svg {...props}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4" /></svg>;
  return <svg {...props}><path d="M5 3h10l4 4v14H5Z" /><path d="M15 3v5h5M8 12h8M8 16h6" /></svg>;
}

export function PaginaMisSolicitudes() {
  const [grupo, setGrupo] = useState("TODOS");
  const [pagina, setPagina] = useState(paginaVacia);
  const [estado, setEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });
  const [modal, setModal] = useState("");
  const [catalogo, setCatalogo] = useState([]);
  const [categoria, setCategoria] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [tramite, setTramite] = useState(null);
  const [areas, setAreas] = useState([]);
  const [solicitud, setSolicitud] = useState(null);
  const [aspirante, setAspirante] = useState(aspiranteVacio);
  const [espacio, setEspacio] = useState(espacioVacio);
  const [denuncia, setDenuncia] = useState(denunciaVacia);
  const [resena, setResena] = useState({ estrellas: 5, comentario: "" });
  const [exito, setExito] = useState("");
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState("");
  const [orden, setOrden] = useState("RECIENTES");

  async function cargar(codigoGrupo = grupo, numeroPagina = 0) {
    setEstado((actual) => ({ ...actual, cargando: true, error: "" }));
    try { setPagina(await api.listarMisSolicitudes({ grupo: codigoGrupo, pagina: numeroPagina })); setEstado((a) => ({ ...a, cargando: false })); }
    catch (error) { setEstado((a) => ({ ...a, cargando: false, error: error.message })); }
  }
  useEffect(() => { cargar(grupo, 0); }, [grupo]);

  async function abrirCatalogo() {
    setEstado((a) => ({ ...a, cargando: true, error: "", mensaje: "" }));
    try {
      const [categorias, areasParque] = await Promise.all([api.listarCatalogoTramites(), listarAreas()]);
      setCatalogo(categorias); setAreas(areasParque); setModal("catalogo"); setCategoria("TODOS"); setBusqueda("");
      setEstado((a) => ({ ...a, cargando: false }));
    } catch (error) { setEstado((a) => ({ ...a, cargando: false, error: error.message })); }
  }
  async function abrirDenuncias() {
    setEstado((a) => ({ ...a, cargando: true, error: "", mensaje: "" }));
    try {
      const categorias = catalogo.length > 0 ? catalogo : await api.listarCatalogoTramites();
      setCatalogo(categorias); setDenuncia(denunciaVacia); setModal("denuncia");
      setEstado((a) => ({ ...a, cargando: false }));
    } catch (error) { setEstado((a) => ({ ...a, cargando: false, error: error.message })); }
  }
  function cerrarModal() { setModal(""); setTramite(null); setSolicitud(null); setExito(""); setEstado((a) => ({ ...a, error: "" })); }
  async function abrirTramite(codigo) {
    setEstado((a) => ({ ...a, cargando: true, error: "" }));
    try {
      const detalle = await api.consultarTramite(codigo); setTramite(detalle);
      const propia = detalle.resenas.find((item) => item.propia);
      setResena(propia ? { estrellas: propia.estrellas, comentario: propia.comentario } : { estrellas: 5, comentario: "" });
      setModal("detalle"); setEstado((a) => ({ ...a, cargando: false }));
    } catch (error) { setEstado((a) => ({ ...a, cargando: false, error: error.message })); }
  }
  async function guardarResena(evento) {
    evento.preventDefault(); setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try { setTramite(await api.guardarResenaTramite(tramite.codigo, resena)); setEstado((a) => ({ ...a, guardando: false, mensaje: "Gracias por compartir tu experiencia." })); }
    catch (error) { setEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }
  function comenzarTramite() {
    setAspirante(aspiranteVacio); setEspacio(espacioVacio); setSolicitud(null); setModal("paso1");
  }
  async function guardarSolicitante(evento) {
    evento.preventDefault(); setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try {
      const guardada = await api.iniciarBorradorTramite(tramite.codigo, aspirante); setSolicitud(guardada);
      setExito("Se guardó la información del solicitante."); await cargar("BORRADORES", 0); setEstado((a) => ({ ...a, guardando: false }));
    } catch (error) { setEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }
  function seleccionarTipo(tipo) {
    setEspacio((actual) => ({ ...actual, tipoReserva: tipo, cantidadPersonas: tipo === "AFLUENCIAMEDIA" ? 51 : 101 })); setModal("paso2");
  }
  async function guardarEspacio(evento) {
    evento.preventDefault(); setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try {
      const guardada = await api.actualizarBorradorUsoInstalacion(solicitud.idSolicitud, { ...espacio, cantidadPersonas: Number(espacio.cantidadPersonas), version: solicitud.version });
      setSolicitud(guardada); setExito("Se guardó la información del espacio, fecha y horario."); await cargar("BORRADORES", 0); setEstado((a) => ({ ...a, guardando: false }));
    } catch (error) { setEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }
  async function subirDocumento(evento) {
    const selector = evento.currentTarget;
    const archivo = selector.files?.[0];
    if (!archivo) return;
    if (!(archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf"))) {
      selector.value = "";
      setEstado((a) => ({ ...a, error: "Selecciona el DPI en formato PDF." }));
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_DPI) {
      selector.value = "";
      setEstado((a) => ({ ...a, error: "El documento no puede superar 20 MB." }));
      return;
    }
    setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try {
      const agregado = await api.agregarDocumentoSolicitud(solicitud.idSolicitud, archivo);
      setSolicitud((actual) => ({ ...actual, documentos: [...actual.documentos, agregado] }));
      selector.value = "";
      setEstado((a) => ({ ...a, guardando: false, mensaje: "PDF cargado correctamente." }));
    } catch (error) {
      selector.value = "";
      setEstado((a) => ({ ...a, guardando: false, error: error.message }));
    }
  }
  async function quitarDocumento(idDocumento) {
    setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try { await api.eliminarDocumentoSolicitud(solicitud.idSolicitud, idDocumento); setSolicitud((actual) => ({ ...actual, documentos: actual.documentos.filter((d) => d.idSolicitudDocumento !== idDocumento) })); setEstado((a) => ({ ...a, guardando: false })); }
    catch (error) { setEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }
  async function enviarSolicitud() {
    if (solicitud.documentos.length === 0) {
      setEstado((a) => ({ ...a, error: "Debes subir el DPI del solicitante en formato PDF." }));
      return;
    }
    setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try { await api.enviarSolicitud(solicitud.idSolicitud, solicitud.version); cerrarModal(); setGrupo("ENPROCESO"); await cargar("ENPROCESO", 0); setEstado((a) => ({ ...a, guardando: false, mensaje: "Solicitud enviada para revisión." })); }
    catch (error) { setEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }
  async function enviarDenuncia(evento) {
    evento.preventDefault();
    const tramiteRelacionado = catalogo.flatMap((grupoCatalogo) => grupoCatalogo.tramites)
      .find((item) => item.codigo === denuncia.codigoTramite);
    if (!tramiteRelacionado) {
      setEstado((a) => ({ ...a, error: "Selecciona el trámite relacionado." }));
      return;
    }
    setEstado((a) => ({ ...a, guardando: true, error: "" }));
    try {
      await api.enviarDenunciaQueja({ tipo: "QUEJA", asunto: tramiteRelacionado.nombre, descripcion: denuncia.descripcion });
      cerrarModal(); setGrupo("ENPROCESO"); await cargar("ENPROCESO", 0);
      setEstado((a) => ({ ...a, guardando: false, mensaje: "Tu denuncia o queja fue enviada correctamente." }));
    }
    catch (error) { setEstado((a) => ({ ...a, guardando: false, error: error.message })); }
  }
  async function continuarBorrador(idSolicitud) {
    setEstado((a) => ({ ...a, cargando: true, error: "" }));
    try {
      const [guardada, areasParque] = await Promise.all([api.consultarSolicitud(idSolicitud), listarAreas()]);
      const codigo = guardada.detalle.codigoTramite || "RESERVACANCHAS"; setTramite(await api.consultarTramite(codigo));
      setSolicitud(guardada); setAreas(areasParque);
      setAspirante({ nombreCompleto: `${guardada.detalle.datosSolicitante?.nombre || ""} ${guardada.detalle.datosSolicitante?.apellido || ""}`.trim(), dpi: guardada.detalle.datosSolicitante?.dpi || "", telefono: guardada.detalle.datosSolicitante?.celular || "", correo: guardada.detalle.datosSolicitante?.correo || "", representanteLegal: Boolean(guardada.detalle.representanteLegal), institucion: guardada.detalle.institucion || "" });
      setEspacio({ codigoArea: guardada.detalle.codigoArea || "", fechaSolicitada: guardada.detalle.fechaSolicitada || "", horaInicio: guardada.detalle.horaInicio?.slice(0, 5) || "", horaFin: guardada.detalle.horaFin?.slice(0, 5) || "", tipoActividad: guardada.detalle.tipoActividad || "", cantidadPersonas: guardada.detalle.cantidadPersonas || 51, descripcion: guardada.detalle.descripcion || "", tipoReserva: guardada.detalle.tipoReserva || "", nombreResponsable: guardada.detalle.nombreResponsable || "" });
      setModal(guardada.detalle.codigoArea ? "paso3" : guardada.detalle.tipoReserva ? "paso2" : "tipo"); setEstado((a) => ({ ...a, cargando: false }));
    } catch (error) { setEstado((a) => ({ ...a, cargando: false, error: error.message })); }
  }

  async function eliminarBorrador(idSolicitud) {
    if (!window.confirm("¿Deseas eliminar este borrador? Esta acción no se puede deshacer.")) return;
    setEstado((a) => ({ ...a, guardando: true, error: "", mensaje: "" }));
    try {
      await api.eliminarBorradorSolicitud(idSolicitud);
      const paginaDestino = pagina.pagina > 0 && pagina.contenido.length === 1
        ? pagina.pagina - 1 : pagina.pagina;
      await cargar(grupo, paginaDestino);
      setEstado((a) => ({ ...a, guardando: false, mensaje: "Borrador eliminado correctamente." }));
    } catch (error) {
      setEstado((a) => ({ ...a, guardando: false, error: error.message }));
    }
  }

  const catalogoSolicitudes = useMemo(() => catalogo.map((grupoCatalogo) => ({
    ...grupoCatalogo,
    tramites: grupoCatalogo.tramites.filter((item) => item.codigo !== CODIGO_DENUNCIAS_QUEJAS),
  })).filter((grupoCatalogo) => grupoCatalogo.tramites.length > 0), [catalogo]);
  const categoriasVisibles = useMemo(() => catalogoSolicitudes
    .filter((grupoCatalogo) => categoria === "TODOS" || categoria === grupoCatalogo.codigo)
    .map((grupoCatalogo) => ({
      ...grupoCatalogo,
      tramites: grupoCatalogo.tramites.filter((item) => `${item.nombre} ${item.resumen}`.toLowerCase().includes(busqueda.toLowerCase())),
    }))
    .filter((grupoCatalogo) => grupoCatalogo.tramites.length > 0), [catalogoSolicitudes, categoria, busqueda]);
  const totalTramitesVisibles = categoriasVisibles.reduce((total, grupoCatalogo) => total + grupoCatalogo.tramites.length, 0);
  const minimoFecha = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const solicitudesVisibles = useMemo(() => pagina.contenido
    .filter((item) => `${item.idSolicitud} ${item.nombreTipoSolicitud} ${item.estado}`.toLowerCase().includes(busquedaSolicitudes.toLowerCase()))
    .slice()
    .sort((a, b) => (orden === "ANTIGUAS" ? 1 : -1) * (new Date(a.actualizadoEn).getTime() - new Date(b.actualizadoEn).getTime())), [pagina.contenido, busquedaSolicitudes, orden]);
  const totalSolicitudes = pagina.conteos.borradores + pagina.conteos.enProceso + pagina.conteos.finalizadas;

  function seleccionarGrupo(codigo) {
    setGrupo(codigo);
  }

  return <div className="aplicacion-solicitudes">
    <header className="cabecera-portal-solicitudes">
      <div className="contenido-cabecera-portal-solicitudes">
        <Link className="marca-superior-solicitudes" to="/" aria-label="Parque Erick Barrondo · Inicio">
          <span className="monograma-solicitudes"><img src="/imagenes/escudo-guatemala.png" alt="" aria-hidden="true" /></span>
          <span><strong>Parque Erick Barrondo</strong><small>Portal de gestiones</small></span>
        </Link>
        <nav className="navegacion-superior-solicitudes navegacion-superior-solicitudes-reducida" aria-label="Navegación de solicitudes">
          <label className="buscador-superior-solicitudes">
            <IconoPanel tipo="buscar" />
            <input aria-label="Buscar en mis solicitudes" placeholder="Buscar por trámite o número de solicitud…" value={busquedaSolicitudes} onChange={(evento) => setBusquedaSolicitudes(evento.target.value)} />
          </label>
          <button type="button" onClick={abrirDenuncias}><IconoPanel tipo="ayuda" /><span>Denuncias y quejas</span></button>
        </nav>
        <div className="acciones-superiores-solicitudes">
          <button type="button" className="notificaciones-solicitudes" aria-label="Notificaciones"><IconoPanel tipo="campana" /><i /></button>
          <Link to="/perfil" className="cuenta-superior-solicitudes"><span>Mi cuenta</span><b>U</b><i>⌄</i></Link>
        </div>
      </div>
    </header>
    <div className="cuerpo-aplicacion-solicitudes">
      <main className="contenido-aplicacion-solicitudes">
        <section className="encabezado-mis-solicitudes"><div><p>Cuenta personal</p><h1>Mis solicitudes</h1><span>Consulta, continúa y da seguimiento a tus gestiones desde un solo lugar.</span></div><div className="accion-nueva-superior"><button type="button" aria-label="Nueva solicitud" onClick={abrirCatalogo}><IconoPanel tipo="nueva" /> Nueva solicitud</button><button type="button" aria-label="Más opciones de nueva solicitud" onClick={abrirCatalogo}>⌄</button></div></section>
        {estado.error && <p className="mensaje-error mensaje-flotante-solicitudes" role="alert">{estado.error}</p>}{estado.mensaje && <p className="mensaje-exito mensaje-flotante-solicitudes" role="status">{estado.mensaje}</p>}
        <section className="panel-filtros-solicitudes">
          <div className="fila-pestanas-solicitudes"><nav className="pestanas-solicitudes" aria-label="Estados de solicitudes"><button type="button" className={grupo === "TODOS" ? "activo" : ""} onClick={() => seleccionarGrupo("TODOS")}>Todos<b>{totalSolicitudes}</b></button>{grupos.map((item) => <button key={item.codigo} type="button" className={grupo === item.codigo ? "activo" : ""} onClick={() => seleccionarGrupo(item.codigo)}>{item.etiqueta}<b>{pagina.conteos[item.conteo]}</b></button>)}</nav><label className="orden-solicitudes"><span>Ordenar por:</span><select aria-label="Ordenar solicitudes" value={orden} onChange={(evento) => setOrden(evento.target.value)}><option value="RECIENTES">Más recientes</option><option value="ANTIGUAS">Más antiguas</option></select></label></div>
        </section>
        <section className="panel-tabla-solicitudes" aria-label="Listado de solicitudes">
          <div className="encabezado-tabla-solicitudes" aria-hidden="true"><span>N.º solicitud</span><span>Trámite</span><span>Estado</span><span>Fecha</span><span>Última actualización</span><span>Acciones</span></div>
          <div className="resultados-solicitudes" aria-live="polite">
            {estado.cargando && <div className="carga-solicitudes-dashboard"><i /><p>Cargando solicitudes…</p></div>}
            {!estado.cargando && solicitudesVisibles.length === 0 && <div className="estado-vacio-solicitudes estado-vacio-dashboard"><span><IconoPanel tipo="portapapeles" /></span><i className="destello-vacio uno">◇</i><i className="destello-vacio dos">◇</i><h3>No hay solicitudes en esta categoría</h3><p>{busquedaSolicitudes ? "Prueba con otra palabra o número de solicitud." : mensajesVacios[grupo]}</p><button type="button" onClick={abrirCatalogo}>Crear una nueva solicitud</button></div>}
            {solicitudesVisibles.map((item) => <article key={item.idSolicitud} className="tarjeta-solicitud-dashboard"><strong className="numero-tarjeta-solicitud">#{item.idSolicitud}</strong><div className="datos-tarjeta-solicitud"><h3>{item.nombreTipoSolicitud}</h3></div><span className={`estado-solicitud estado-${item.estado.toLowerCase()}`}>{formatearTextoTecnico(item.estado)}</span><time>{formatoFechaCorta.format(new Date(item.creadoEn || item.actualizadoEn))}</time><time>{formatoFecha.format(new Date(item.actualizadoEn))}</time><div className="acciones-tarjeta-solicitud">{item.estado === "BORRADOR" && <><button type="button" className="continuar-tarjeta-solicitud" disabled={estado.guardando} onClick={() => continuarBorrador(item.idSolicitud)}>Continuar <span>→</span></button><button type="button" className="eliminar-tarjeta-solicitud" disabled={estado.guardando} onClick={() => eliminarBorrador(item.idSolicitud)}>Eliminar</button></>}</div>{item.resolucion && <p className="respuesta-solicitud"><strong>Respuesta de la administración</strong>{item.resolucion}</p>}</article>)}
          </div>
        </section>
      </main>
    </div>

    {modal && <div className="fondo-modal-tramites" role="presentation"><section className="modal-tramites" role="dialog" aria-modal="true" aria-label={modal === "denuncia" ? "Denuncias y quejas" : "Nueva solicitud"}><header><div><p className="etiqueta-fase">Ventanilla del parque</p><h2>{modal === "denuncia" ? "Denuncias y quejas" : "Nueva solicitud"}</h2><small>{modal === "catalogo" ? "Busca el trámite que deseas realizar." : modal === "denuncia" ? "Cuéntanos lo sucedido para darle seguimiento." : "Completa la información para continuar."}</small></div><button type="button" className="cerrar-modal-tramites" onClick={cerrarModal} aria-label="Cerrar">×</button></header>{estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {modal === "catalogo" && <Catalogo catalogo={catalogoSolicitudes} categoria={categoria} setCategoria={setCategoria} busqueda={busqueda} setBusqueda={setBusqueda} categoriasVisibles={categoriasVisibles} totalTramites={totalTramitesVisibles} abrir={abrirTramite} />}
      {modal === "detalle" && tramite && <DetalleTramite tramite={tramite} volver={() => setModal("catalogo")} comenzar={comenzarTramite} resena={resena} setResena={setResena} guardarResena={guardarResena} guardando={estado.guardando} />}
      {modal === "paso1" && <PasoSolicitante datos={aspirante} setDatos={setAspirante} guardar={guardarSolicitante} guardando={estado.guardando} />}
      {modal === "tipo" && <SelectorTipo seleccionar={seleccionarTipo} volver={() => setModal("paso1")} />}
      {modal === "paso2" && <PasoEspacio datos={espacio} setDatos={setEspacio} areas={areas} minimoFecha={minimoFecha} guardar={guardarEspacio} volver={() => setModal("tipo")} guardando={estado.guardando} />}
      {modal === "paso3" && solicitud && <PasoDocumentos solicitud={solicitud} subir={subirDocumento} quitar={quitarDocumento} enviar={enviarSolicitud} volver={() => setModal("paso2")} continuar={cerrarModal} guardando={estado.guardando} />}
      {modal === "denuncia" && <FormularioDenuncia datos={denuncia} setDatos={setDenuncia} enviar={enviarDenuncia} guardando={estado.guardando} catalogo={catalogoSolicitudes} />}
      {exito && <div className="fondo-exito-guardado"><div><span>✓</span><h3>Guardado exitoso</h3><p>{exito}</p><button type="button" onClick={() => { setExito(""); setModal(modal === "paso1" ? "tipo" : "paso3"); }}>Continuar</button></div></div>}
    </section></div>}
  </div>;
}

function Catalogo({ catalogo, categoria, setCategoria, busqueda, setBusqueda, categoriasVisibles, totalTramites, abrir }) {
  return <div className="contenido-modal-tramites catalogo-tramites"><p className="etiqueta-fase">Catálogo de trámites</p><div className="titulo-catalogo"><div><h3>¿Qué trámite deseas realizar?</h3><p>Elige una categoría padre y luego el trámite que necesitas.</p></div><span>{totalTramites} trámites</span></div><label className="buscador-tramites"><span>⌕</span><input aria-label="Buscar trámite" placeholder="Ej.: reserva de cancha, área o actividad…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label><nav className="categorias-tramites" aria-label="Categorías padre de trámites"><button type="button" className={categoria === "TODOS" ? "activo" : ""} onClick={() => setCategoria("TODOS")}>Todas</button>{catalogo.map((item) => <button type="button" key={item.codigo} className={categoria === item.codigo ? "activo" : ""} onClick={() => setCategoria(item.codigo)}>{item.nombre}</button>)}</nav><div className="grupos-catalogo-tramites">{categoriasVisibles.map((grupoCatalogo) => <section className="grupo-catalogo-tramites" key={grupoCatalogo.codigo}><header><span>Categoría padre</span><h4>{grupoCatalogo.nombre}</h4></header><div className="lista-catalogo-tramites">{grupoCatalogo.tramites.map((item) => <button type="button" key={item.codigo} onClick={() => abrir(item.codigo)}><span className="miniatura-tramite">{item.urlPortada ? <img src={item.urlPortada} alt="" /> : "▣"}</span><span><i>Trámite hijo</i><strong>{item.nombre}</strong><small>{item.resumen}</small></span><b>›</b></button>)}</div></section>)}</div>{totalTramites === 0 && <p className="estado-vacio-catalogo">No se encontraron trámites con esos filtros.</p>}</div>;
}

function DetalleTramite({ tramite, volver, comenzar, resena, setResena, guardarResena, guardando }) {
  return <div className="contenido-modal-tramites detalle-tramite"><button type="button" className="enlace-boton" onClick={volver}>← Volver al catálogo</button><p className="etiqueta-fase">{tramite.categoria}</p><h3>{tramite.nombre}</h3><p>{tramite.resumen}</p><div className="columnas-detalle-tramite"><div><article><h4>Acerca de este trámite</h4><p>{tramite.acerca}</p></article><article><h4>Documentos y requisitos solicitados</h4><ul>{tramite.requisitos.map((item) => <li key={item}>{item}</li>)}</ul><strong>Documentos:</strong><ul>{tramite.documentosRequeridos.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="experiencias-tramite"><h4>Experiencias de usuarios</h4>{tramite.resenas.map((item) => <div key={item.idResena}><span className="avatar-resena">{item.nombreUsuario.charAt(0)}</span><p><strong>{item.nombreUsuario}</strong><small>{tiempoRelativo(item.actualizadoEn)}</small><Estrellas valor={item.estrellas} lectura /><br />{item.comentario}</p></div>)}{tramite.resenas.length === 0 && <p>Aún no hay comentarios. Puedes ser la primera persona en calificar este trámite.</p>}<form onSubmit={guardarResena}><h5>Califica tu experiencia</h5><Estrellas valor={resena.estrellas} onChange={(estrellas) => setResena({ ...resena, estrellas })} /><textarea aria-label="Comentario de la experiencia" required maxLength="1000" value={resena.comentario} onChange={(e) => setResena({ ...resena, comentario: e.target.value })} /><button disabled={guardando}>Publicar comentario</button></form></article></div><aside>{tramite.urlPortada ? <img src={tramite.urlPortada} alt={`Portada de ${tramite.nombre}`} /> : <div className="portada-tramite-vacia">Parque Erick Barrondo</div>}<button type="button" onClick={comenzar}>▷ Iniciar solicitud</button><article><h4>Información general</h4><p><strong>Costo:</strong> {tramite.costo}</p><p><strong>Tiempo de respuesta:</strong> {tramite.tiempoRespuesta}</p><p><strong>Dependencia:</strong> Parque Erick Bernabé Barrondo García</p><p><Estrellas valor={Math.round(tramite.promedioEstrellas)} lectura /> ({tramite.totalResenas})</p></article></aside></div></div>;
}

function PasoSolicitante({ datos, setDatos, guardar, guardando }) {
  return <div className="contenido-modal-tramites formulario-tramite"><Pasos paso={1} /><h3>Paso 1 · Información del solicitante</h3><p className="nota-informativa-solicitud"><strong>Importante:</strong> escribe tus datos tal y como aparecen en tu DPI.</p><form onSubmit={guardar} className="cuadricula-formulario-solicitud"><label>Nombre completo *<input required maxLength="200" value={datos.nombreCompleto} onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })} /></label><label>DPI - CUI *<input required inputMode="numeric" pattern="[0-9]{13}" maxLength="13" value={datos.dpi} onChange={(e) => setDatos({ ...datos, dpi: e.target.value })} /></label><label>Teléfono *<input required value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} /></label><label>Correo electrónico *<input type="email" required value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} /></label><label>¿Eres representante legal de una institución? *<select value={String(datos.representanteLegal)} onChange={(e) => setDatos({ ...datos, representanteLegal: e.target.value === "true" })}><option value="false">No</option><option value="true">Sí</option></select></label>{datos.representanteLegal && <label>Institución *<input required value={datos.institucion} onChange={(e) => setDatos({ ...datos, institucion: e.target.value })} /></label>}<div className="acciones-formulario-solicitud campo-ancho"><button disabled={guardando}>Guardar y siguiente</button></div></form></div>;
}

function SelectorTipo({ seleccionar, volver }) {
  return <div className="contenido-modal-tramites selector-tipo-reserva"><Pasos paso={2} /><h3>¿Qué tipo de reserva deseas realizar?</h3><button type="button" onClick={() => seleccionar("AFLUENCIAMEDIA")}><span>⚽</span><span><strong>Reserva recreativa de afluencia media</strong><small>Actividades programadas con 7 días de anticipación (51 a 100 personas).</small></span></button><button type="button" onClick={() => seleccionar("MAYORAFLUENCIA")}><span>♟</span><span><strong>Reserva de mayor afluencia</strong><small>Actividades con 7 días de anticipación, para afluencias de 101 a 500 personas.</small></span></button><div className="acciones-formulario-solicitud"><button type="button" className="boton-secundario" onClick={volver}>Anterior</button></div></div>;
}

function PasoEspacio({ datos, setDatos, areas, minimoFecha, guardar, volver, guardando }) {
  return <div className="contenido-modal-tramites formulario-tramite"><Pasos paso={2} /><h3>Paso 2 · Información del espacio</h3><p><strong>{datos.tipoReserva === "MAYORAFLUENCIA" ? "Reserva de mayor afluencia" : "Reserva recreativa de afluencia media"}</strong></p><p className="nota-informativa-solicitud"><strong>Importante:</strong> solo se recibirán solicitudes con 7 días de anticipación y están sujetas a disponibilidad.</p><form onSubmit={guardar} className="cuadricula-formulario-solicitud"><label>Centro deportivo *<select required value="PARQUEERICK" readOnly><option value="PARQUEERICK">Centro Deportivo y Recreativo Parque Erick Bernabé Barrondo García</option></select></label><label>Campo o cancha *<select required value={datos.codigoArea} onChange={(e) => setDatos({ ...datos, codigoArea: e.target.value })}><option value="">Seleccione</option>{areas.map((area) => <option key={area.codigo} value={area.codigo}>{area.numeroVisibleMapa ? `Cancha #${area.numeroVisibleMapa} · ` : ""}{area.nombre}</option>)}</select></label><label>Nombre de la actividad *<input required maxLength="120" value={datos.tipoActividad} onChange={(e) => setDatos({ ...datos, tipoActividad: e.target.value })} /></label><label>Fecha *<input type="date" min={minimoFecha} required value={datos.fechaSolicitada} onChange={(e) => setDatos({ ...datos, fechaSolicitada: e.target.value })} /></label><label>Hora de inicio *<input type="time" required value={datos.horaInicio} onChange={(e) => setDatos({ ...datos, horaInicio: e.target.value })} /></label><label>Hora de finalización *<input type="time" required value={datos.horaFin} onChange={(e) => setDatos({ ...datos, horaFin: e.target.value })} /></label><label>Cantidad de personas *<input type="number" required min={datos.tipoReserva === "MAYORAFLUENCIA" ? 101 : 51} max={datos.tipoReserva === "MAYORAFLUENCIA" ? 500 : 100} value={datos.cantidadPersonas} onChange={(e) => setDatos({ ...datos, cantidadPersonas: e.target.value })} /></label><label>Nombre completo del responsable *<input required value={datos.nombreResponsable} onChange={(e) => setDatos({ ...datos, nombreResponsable: e.target.value })} /></label><label className="campo-ancho">Descripción de la actividad *<textarea required rows="4" maxLength="3000" value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} /></label><div className="acciones-formulario-solicitud campo-ancho"><button type="button" className="boton-secundario" onClick={volver}>Anterior</button><button disabled={guardando}>Guardar y siguiente</button></div></form></div>;
}

function PasoDocumentos({ solicitud, subir, quitar, enviar, volver, continuar, guardando }) {
  return <div className="contenido-modal-tramites formulario-tramite"><Pasos paso={3} /><h3>Paso 3 · Carga de documentos</h3><p className="nota-informativa-solicitud"><strong>Estás a un paso:</strong> carga el DPI vigente en formato PDF. El comprobante de envío no significa que la solicitud esté aprobada.</p><article className="cargador-pdf-solicitud"><span>PDF</span><h4>DPI del solicitante o representante legal *</h4><p>Formato PDF, tamaño máximo 20 MB. El DPI debe incluir ambos lados.</p><input aria-label="DPI en PDF" name="archivo" type="file" accept="application/pdf,.pdf" disabled={guardando} onChange={subir} /><small>El archivo se carga automáticamente al seleccionarlo.</small></article><ul className="lista-documentos-solicitud">{solicitud.documentos.map((d) => <li key={d.idSolicitudDocumento}><a href={d.urlDescarga}>{d.nombreArchivo}</a><span>PDF obligatorio</span><button type="button" onClick={() => quitar(d.idSolicitudDocumento)}>Quitar</button></li>)}</ul><div className="acciones-formulario-solicitud"><button type="button" className="boton-secundario" onClick={volver}>Anterior</button><button type="button" disabled={guardando} onClick={enviar}>Enviar solicitud</button><button type="button" className="boton-secundario" onClick={continuar}>Continuar después</button></div></div>;
}

function FormularioDenuncia({ datos, setDatos, enviar, guardando, catalogo }) {
  return <div className="contenido-modal-tramites formulario-tramite formulario-denuncia"><h3>Denuncias y quejas</h3><p><strong>Estamos para servirte.</strong> Selecciona el trámite relacionado y describe claramente lo sucedido.</p><form onSubmit={enviar} className="cuadricula-formulario-solicitud"><label className="campo-ancho">Trámite relacionado *<select required value={datos.codigoTramite} onChange={(e) => setDatos({ ...datos, codigoTramite: e.target.value })}><option value="">Seleccione</option>{catalogo.map((categoriaTramite) => <optgroup key={categoriaTramite.codigo} label={categoriaTramite.nombre}>{categoriaTramite.tramites.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}</optgroup>)}</select></label><label className="campo-ancho">Describe aquí lo sucedido *<textarea required rows="7" maxLength="3000" value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} /></label><div className="acciones-formulario-solicitud campo-ancho"><button disabled={guardando}>Enviar</button></div></form></div>;
}
