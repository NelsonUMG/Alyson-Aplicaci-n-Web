import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as apiSolicitudes from "../api/solicitudes";
import { listarAreas } from "../api/portalPublico";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const grupos = [
  { codigo: "BORRADORES", etiqueta: "Borradores", conteo: "borradores" },
  { codigo: "ENPROCESO", etiqueta: "Enviadas", conteo: "enProceso" },
  { codigo: "FINALIZADAS", etiqueta: "Finalizadas", conteo: "finalizadas" },
  { codigo: "RECHAZADAS", etiqueta: "Rechazadas", conteo: "rechazadas" },
];

const paginaVacia = {
  contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
  conteos: { borradores: 0, enProceso: 0, finalizadas: 0, rechazadas: 0 },
};

const mensajesVacios = {
  BORRADORES: "No tienes solicitudes guardadas como borrador.",
  ENPROCESO: "No tienes solicitudes enviadas o en revisión.",
  FINALIZADAS: "No tienes solicitudes finalizadas.",
  RECHAZADAS: "No tienes solicitudes rechazadas.",
};

const datosVacios = {
  codigoArea: "", fechaSolicitada: "", horaInicio: "", horaFin: "",
  tipoActividad: "", cantidadPersonas: 1, descripcion: "",
};

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "long", timeStyle: "short", timeZone: "America/Guatemala",
});

function datosDesdeSolicitud(solicitud) {
  const detalle = solicitud.detalle;
  return {
    codigoArea: detalle.codigoArea,
    fechaSolicitada: detalle.fechaSolicitada,
    horaInicio: detalle.horaInicio?.slice(0, 5) || "",
    horaFin: detalle.horaFin?.slice(0, 5) || "",
    tipoActividad: detalle.tipoActividad,
    cantidadPersonas: detalle.cantidadPersonas,
    descripcion: detalle.descripcion,
  };
}

function PasosSolicitud({ paso }) {
  return (
    <ol className="pasos-solicitud" aria-label="Progreso de la solicitud">
      {["Datos", "Documentos", "Revisión"].map((nombre, indice) => (
        <li key={nombre} className={paso === indice + 1 ? "activo" : paso > indice + 1 ? "completado" : ""}>
          <span>{indice + 1}</span>{nombre}
        </li>
      ))}
    </ol>
  );
}

export function PaginaMisSolicitudes() {
  const [grupo, establecerGrupo] = useState("ENPROCESO");
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });
  const [mostrarCatalogo, establecerMostrarCatalogo] = useState(false);
  const [procedimiento, establecerProcedimiento] = useState(null);
  const [areas, establecerAreas] = useState([]);
  const [paso, establecerPaso] = useState(0);
  const [solicitudActiva, establecerSolicitudActiva] = useState(null);
  const [datos, establecerDatos] = useState(datosVacios);

  async function cargar(codigoGrupo, numeroPagina) {
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "" }));
    try {
      establecerPagina(await apiSolicitudes.listarMisSolicitudes({ grupo: codigoGrupo, pagina: numeroPagina }));
      establecerEstado((actual) => ({ ...actual, cargando: false, error: "" }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message }));
    }
  }

  useEffect(() => { cargar(grupo, 0); }, [grupo]);

  async function abrirProcedimiento() {
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      const [informacion, areasParque] = await Promise.all([
        apiSolicitudes.consultarProcedimientoUsoInstalacion(), listarAreas(),
      ]);
      establecerProcedimiento(informacion);
      establecerAreas(areasParque);
      establecerPaso(0);
      establecerEstado((actual) => ({ ...actual, cargando: false }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message }));
    }
  }

  function comenzar() {
    establecerSolicitudActiva(null);
    establecerDatos(datosVacios);
    establecerPaso(1);
  }

  async function continuarBorrador(idSolicitud) {
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      const [informacion, areasParque, solicitud] = await Promise.all([
        apiSolicitudes.consultarProcedimientoUsoInstalacion(), listarAreas(),
        apiSolicitudes.consultarSolicitud(idSolicitud),
      ]);
      establecerProcedimiento(informacion);
      establecerAreas(areasParque);
      establecerSolicitudActiva(solicitud);
      establecerDatos(datosDesdeSolicitud(solicitud));
      establecerMostrarCatalogo(true);
      establecerPaso(1);
      establecerEstado((actual) => ({ ...actual, cargando: false }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message }));
    }
  }

  async function guardarDatos(evento, avanzar) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const cuerpo = { ...datos, cantidadPersonas: Number(datos.cantidadPersonas), version: solicitudActiva?.version };
    try {
      const guardada = solicitudActiva
        ? await apiSolicitudes.actualizarBorradorUsoInstalacion(solicitudActiva.idSolicitud, cuerpo)
        : await apiSolicitudes.crearBorradorUsoInstalacion(cuerpo);
      establecerSolicitudActiva(guardada);
      if (avanzar) establecerPaso(2);
      establecerEstado((actual) => ({
        ...actual, guardando: false, mensaje: avanzar ? "Datos guardados." : "Borrador guardado.",
      }));
      await cargar("BORRADORES", 0);
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  async function subirDocumento(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const archivo = new window.FormData(formulario).get("archivo");
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const agregado = await apiSolicitudes.agregarDocumentoSolicitud(solicitudActiva.idSolicitud, archivo);
      establecerSolicitudActiva((actual) => ({ ...actual, documentos: [...actual.documentos, agregado] }));
      formulario.reset();
      establecerEstado((actual) => ({ ...actual, guardando: false, mensaje: "Documento agregado." }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  async function quitarDocumento(idDocumentoSolicitud) {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await apiSolicitudes.eliminarDocumentoSolicitud(solicitudActiva.idSolicitud, idDocumentoSolicitud);
      establecerSolicitudActiva((actual) => ({
        ...actual,
        documentos: actual.documentos.filter((documento) => documento.idSolicitudDocumento !== idDocumentoSolicitud),
      }));
      establecerEstado((actual) => ({ ...actual, guardando: false, mensaje: "Documento eliminado." }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  async function enviar() {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await apiSolicitudes.enviarSolicitud(solicitudActiva.idSolicitud, solicitudActiva.version);
      establecerPaso(0);
      establecerProcedimiento(null);
      establecerSolicitudActiva(null);
      establecerMostrarCatalogo(false);
      establecerGrupo("ENPROCESO");
      await cargar("ENPROCESO", 0);
      establecerEstado((actual) => ({
        ...actual, guardando: false,
        mensaje: "Solicitud enviada. La administración revisará la disponibilidad antes de responder.",
      }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message }));
    }
  }

  const areaSeleccionada = areas.find((area) => area.codigo === datos.codigoArea);

  return (
    <main className="pagina-cuenta pagina-mis-solicitudes">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <header className="cabecera-cuenta cabecera-mis-solicitudes">
        <div>
          <p className="etiqueta-fase">Cuenta personal</p>
          <h1>Mis solicitudes</h1>
          <p>Consulta el avance y las respuestas de las gestiones realizadas ante el Parque Erick Barrondo.</p>
        </div>
        <button type="button" onClick={() => { establecerMostrarCatalogo((actual) => !actual); establecerProcedimiento(null); establecerPaso(0); }}>
          {mostrarCatalogo ? "Cerrar catálogo" : "Nueva solicitud"}
        </button>
      </header>

      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      {mostrarCatalogo && !procedimiento && (
        <section className="panel-cuenta catalogo-solicitudes" aria-labelledby="titulo-catalogo-solicitudes">
          <div className="cabecera-catalogo-solicitudes">
            <div><p className="etiqueta-fase">Gestiones del parque</p><h2 id="titulo-catalogo-solicitudes">Solicitudes disponibles</h2></div>
            <p>Solo se muestran gestiones correspondientes al Parque Erick Barrondo.</p>
          </div>
          <article className="tarjeta-catalogo-solicitud">
            <span className="etiqueta-estado">Gestión del parque</span>
            <h3>Uso de cancha o instalación</h3>
            <p>Solicita el uso de una cancha, área deportiva o instalación del parque.</p>
            <p className="nota-catalogo-solicitud">La administración comprobará la disponibilidad y comunicará si la gestión fue aprobada o rechazada.</p>
            <button type="button" disabled={estado.cargando} onClick={abrirProcedimiento}>Ver requisitos y comenzar</button>
          </article>
        </section>
      )}

      {procedimiento && paso === 0 && (
        <section className="panel-cuenta procedimiento-solicitud" aria-labelledby="titulo-procedimiento">
          <p className="etiqueta-fase">Antes de comenzar</p>
          <h2 id="titulo-procedimiento">{procedimiento.nombre}</h2>
          <p>{procedimiento.descripcion}</p>
          <dl className="datos-procedimiento">
            <div><dt>Finalidad</dt><dd>{procedimiento.finalidad}</dd></div>
            <div><dt>Información requerida</dt><dd><ul>{procedimiento.informacionRequerida.map((item) => <li key={item}>{item}</li>)}</ul></dd></div>
            <div><dt>Documentos obligatorios</dt><dd>{procedimiento.documentosObligatorios.length ? procedimiento.documentosObligatorios.join(", ") : "Ninguno"}</dd></div>
            <div><dt>Documentos opcionales</dt><dd>{procedimiento.documentosOpcionales.join(", ")}</dd></div>
            <div><dt>Costo</dt><dd>{procedimiento.costo}</dd></div>
          </dl>
          <p className="advertencia-solicitud">{procedimiento.advertenciaDisponibilidad}</p>
          <div className="acciones-formulario-solicitud"><button type="button" onClick={comenzar}>Comenzar solicitud</button><button type="button" className="boton-secundario" onClick={() => establecerProcedimiento(null)}>Volver al catálogo</button></div>
        </section>
      )}

      {procedimiento && paso > 0 && (
        <section className="panel-cuenta formulario-solicitud-instalacion" aria-labelledby="titulo-formulario-solicitud">
          <p className="etiqueta-fase">Solicitud del parque</p>
          <h2 id="titulo-formulario-solicitud">Uso de cancha o instalación</h2>
          <PasosSolicitud paso={paso} />

          {paso === 1 && (
            <form onSubmit={(evento) => guardarDatos(evento, true)}>
              <h3>Datos de la solicitud</h3>
              <p>Los datos personales se toman de tu cuenta registrada y no necesitas escribirlos nuevamente.</p>
              {solicitudActiva?.detalle?.datosSolicitante && <dl className="resumen-datos-cuenta"><div><dt>Persona solicitante</dt><dd>{solicitudActiva.detalle.datosSolicitante.nombre} {solicitudActiva.detalle.datosSolicitante.apellido}</dd></div><div><dt>Correo</dt><dd>{solicitudActiva.detalle.datosSolicitante.correo}</dd></div><div><dt>DPI o CUI</dt><dd>{solicitudActiva.detalle.datosSolicitante.dpi}</dd></div><div><dt>Celular</dt><dd>{solicitudActiva.detalle.datosSolicitante.celular}</dd></div></dl>}
              <div className="cuadricula-formulario-solicitud">
                <label>Cancha o instalación<select required value={datos.codigoArea} onChange={(evento) => establecerDatos({ ...datos, codigoArea: evento.target.value })}><option value="">Selecciona una instalación</option>{areas.map((area) => <option key={area.codigo} value={area.codigo}>{area.nombre} · {formatearTextoTecnico(area.estado)}</option>)}</select></label>
                <label>Fecha solicitada<input type="date" required min={new Date().toISOString().slice(0, 10)} value={datos.fechaSolicitada} onChange={(evento) => establecerDatos({ ...datos, fechaSolicitada: evento.target.value })} /></label>
                <label>Hora de inicio<input type="time" required value={datos.horaInicio} onChange={(evento) => establecerDatos({ ...datos, horaInicio: evento.target.value })} /></label>
                <label>Hora de finalización<input type="time" required value={datos.horaFin} onChange={(evento) => establecerDatos({ ...datos, horaFin: evento.target.value })} /></label>
                <label>Tipo de actividad<input required maxLength="120" value={datos.tipoActividad} onChange={(evento) => establecerDatos({ ...datos, tipoActividad: evento.target.value })} /></label>
                <label>Cantidad estimada de personas<input type="number" required min="1" max="10000" value={datos.cantidadPersonas} onChange={(evento) => establecerDatos({ ...datos, cantidadPersonas: evento.target.value })} /></label>
                <label className="campo-ancho">Descripción de la actividad<textarea required rows="4" maxLength="3000" value={datos.descripcion} onChange={(evento) => establecerDatos({ ...datos, descripcion: evento.target.value })} /></label>
              </div>
              {areaSeleccionada?.notaDisponibilidad && <p className="nota-disponibilidad-area"><strong>Información de la instalación:</strong> {areaSeleccionada.notaDisponibilidad}</p>}
              <div className="acciones-formulario-solicitud"><button type="submit" disabled={estado.guardando}>Guardar y continuar</button><button type="button" className="boton-secundario" disabled={estado.guardando} onClick={(evento) => guardarDatos(evento, false)}>Guardar borrador</button></div>
            </form>
          )}

          {paso === 2 && (
            <div>
              <h3>Documentos</h3>
              <p><strong>Obligatorios:</strong> ninguno.</p>
              <p><strong>Opcionales:</strong> puedes adjuntar hasta cinco archivos de respaldo en PDF, PNG o JPEG, de máximo 5 MB cada uno.</p>
              <form className="formulario-documento-solicitud" onSubmit={subirDocumento}><label>Documento de respaldo<input name="archivo" type="file" accept="application/pdf,image/png,image/jpeg" required /></label><button type="submit" disabled={estado.guardando || solicitudActiva.documentos.length >= 5}>Adjuntar documento</button></form>
              <ul className="lista-documentos-solicitud">{solicitudActiva.documentos.map((documento) => <li key={documento.idSolicitudDocumento}><a href={documento.urlDescarga}>{documento.nombreArchivo}</a><span>{Math.ceil(documento.tamanoBytes / 1024)} KB · Opcional</span><button type="button" className="boton-peligro" disabled={estado.guardando} onClick={() => quitarDocumento(documento.idSolicitudDocumento)}>Quitar</button></li>)}</ul>
              {solicitudActiva.documentos.length === 0 && <p>No has adjuntado documentos opcionales.</p>}
              <div className="acciones-formulario-solicitud"><button type="button" onClick={() => establecerPaso(3)}>Continuar a revisión</button><button type="button" className="boton-secundario" onClick={() => establecerPaso(1)}>Volver a datos</button><button type="button" className="boton-secundario" onClick={() => { establecerPaso(0); establecerProcedimiento(null); establecerMostrarCatalogo(false); establecerGrupo("BORRADORES"); }}>Continuar después</button></div>
            </div>
          )}

          {paso === 3 && (
            <div className="revision-solicitud">
              <h3>Revisa antes de enviar</h3>
              <dl><div><dt>Instalación</dt><dd>{solicitudActiva.detalle.nombreArea}</dd></div><div><dt>Fecha</dt><dd>{solicitudActiva.detalle.fechaSolicitada}</dd></div><div><dt>Horario</dt><dd>{solicitudActiva.detalle.horaInicio} a {solicitudActiva.detalle.horaFin}</dd></div><div><dt>Actividad</dt><dd>{solicitudActiva.detalle.tipoActividad}</dd></div><div><dt>Personas</dt><dd>{solicitudActiva.detalle.cantidadPersonas}</dd></div><div><dt>Descripción</dt><dd>{solicitudActiva.detalle.descripcion}</dd></div><div><dt>Documentos</dt><dd>{solicitudActiva.documentos.length || "Ninguno"}</dd></div></dl>
              <p className="advertencia-solicitud">Enviar esta solicitud no reserva la instalación. La administración revisará la disponibilidad real, los datos y los documentos antes de responder.</p>
              <div className="acciones-formulario-solicitud"><button type="button" disabled={estado.guardando} onClick={enviar}>Enviar solicitud</button><button type="button" className="boton-secundario" onClick={() => establecerPaso(2)}>Volver a documentos</button></div>
            </div>
          )}
        </section>
      )}

      <nav className="filtros-mis-solicitudes" aria-label="Estados de solicitudes">
        {grupos.map((opcion) => <button key={opcion.codigo} type="button" className={grupo === opcion.codigo ? "activo" : ""} aria-pressed={grupo === opcion.codigo} onClick={() => { if (opcion.codigo !== grupo) establecerGrupo(opcion.codigo); }}><span>{opcion.etiqueta}</span><strong>{pagina.conteos[opcion.conteo]}</strong></button>)}
      </nav>

      <section className="panel-cuenta lista-mis-solicitudes" aria-live="polite" aria-label="Solicitudes registradas">
        {estado.cargando && <p className="estado-carga-solicitudes">Cargando solicitudes…</p>}
        {!estado.cargando && pagina.contenido.length === 0 && <div className="estado-vacio-solicitudes"><span aria-hidden="true">✓</span><h2>Sin solicitudes en esta sección</h2><p>{mensajesVacios[grupo]}</p></div>}
        {pagina.contenido.map((solicitud) => <article key={solicitud.idSolicitud} className="tarjeta-solicitud-usuario"><div className="cabecera-solicitud-usuario"><div><p className="referencia-solicitud">Solicitud #{solicitud.idSolicitud}</p><h2>{solicitud.nombreTipoSolicitud}</h2></div><span className={`estado-solicitud estado-${solicitud.estado.toLowerCase()}`}>{formatearTextoTecnico(solicitud.estado)}</span></div><dl><div><dt>Creada</dt><dd>{formatoFecha.format(new Date(solicitud.creadoEn))}</dd></div><div><dt>Última actualización</dt><dd>{formatoFecha.format(new Date(solicitud.actualizadoEn))}</dd></div></dl>{solicitud.estado === "BORRADOR" && <button type="button" onClick={() => continuarBorrador(solicitud.idSolicitud)}>Continuar borrador</button>}{solicitud.resolucion && <div className="respuesta-solicitud"><strong>Respuesta de administración</strong><p>{solicitud.resolucion}</p></div>}</article>)}
        {!estado.cargando && pagina.totalElementos > 0 && <div className="acciones-paginacion"><button type="button" disabled={pagina.pagina <= 0} onClick={() => cargar(grupo, pagina.pagina - 1)}>Anterior</button><span>Página {pagina.pagina + 1} de {pagina.totalPaginas}</span><button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cargar(grupo, pagina.pagina + 1)}>Siguiente</button></div>}
      </section>
    </main>
  );
}
