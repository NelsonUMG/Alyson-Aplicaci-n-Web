import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorApi, obtenerMensajeError } from "../api/clienteHttp";
import {
  cancelarInscripcionEvento,
  consultarInscripcionEvento,
  inscribirEnEvento,
} from "../api/inscripcionesEventos";
import { consultarEvento } from "../api/portalPublico";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { formatearTextoEditorial } from "../utilidades/formatoTexto";

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

function interpretarRequisitos(esquemaFormularioJson) {
  if (!esquemaFormularioJson) return [];
  try {
    const esquema = JSON.parse(esquemaFormularioJson);
    return Array.isArray(esquema.campos) ? esquema.campos : [];
  } catch {
    return [];
  }
}

function interpretarGrupos(configuracionGruposJson) {
  if (!configuracionGruposJson) return [];
  try {
    const configuracion = JSON.parse(configuracionGruposJson);
    return Array.isArray(configuracion.grupos) ? configuracion.grupos : [];
  } catch { return []; }
}

function calcularEdad(fechaNacimiento, fechaActividad) {
  if (!fechaNacimiento || !fechaActividad) return null;
  const nacimiento = new Date(`${fechaNacimiento}T12:00:00`);
  const actividad = new Date(fechaActividad);
  if (Number.isNaN(nacimiento.getTime()) || Number.isNaN(actividad.getTime())) return null;
  let edad = actividad.getFullYear() - nacimiento.getFullYear();
  const antesDelCumpleanos = actividad.getMonth() < nacimiento.getMonth()
    || (actividad.getMonth() === nacimiento.getMonth() && actividad.getDate() < nacimiento.getDate());
  if (antesDelCumpleanos) edad -= 1;
  return edad;
}

const nombresDias = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles", JUEVES: "Jueves",
  VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
};

function CampoRequisito({ campo, valor, alCambiar }) {
  const propiedades = {
    id: `requisito-${campo.id}`,
    required: campo.obligatorio,
    value: valor ?? "",
    onChange: (evento) => alCambiar(campo.id, evento.target.value),
  };
  if (campo.tipo === "TEXTO_LARGO") return <textarea {...propiedades} rows="4" maxLength="5000" />;
  if (campo.tipo === "FECHA") return <input {...propiedades} type="date" />;
  if (campo.tipo === "NUMERO") return <input {...propiedades} type="number" step="any" />;
  if (campo.tipo === "DPI_CUI") {
    return <input {...propiedades} type="text" inputMode="numeric" pattern="[0-9]{13}" maxLength="13" title="Ingresa exactamente los 13 números del DPI o CUI." />;
  }
  if (campo.tipo === "SI_NO") {
    return <select {...propiedades}><option value="">Selecciona</option><option value="true">Sí</option><option value="false">No</option></select>;
  }
  if (campo.tipo === "SELECCION_UNICA") {
    return <select {...propiedades}><option value="">Selecciona</option>{(campo.opciones || []).map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>;
  }
  return <input {...propiedades} type="text" maxLength="500" />;
}

export function PaginaDetalleEvento() {
  const { identificadorUrl } = useParams();
  const { usuario, cargando: cargandoSesion } = usarSesion();
  return <DetalleEvento key={`${identificadorUrl}:${usuario?.idUsuario ?? usuario?.correo ?? "visitante"}`} identificadorUrl={identificadorUrl} usuario={usuario} cargandoSesion={cargandoSesion} />;
}

function DetalleEvento({ identificadorUrl, usuario, cargandoSesion }) {
  const [evento, establecerEvento] = useState(null);
  const [inscripcion, establecerInscripcion] = useState(null);
  const [estadoConsulta, establecerEstadoConsulta] = useState("cargando");
  const [reintento, establecerReintento] = useState(0);
  const operacionEnCurso = useRef(false);
  const [respuestasRequisitos, establecerRespuestasRequisitos] = useState({});
  const [codigoGrupo, establecerCodigoGrupo] = useState("");
  const [motivoCancelacion, establecerMotivoCancelacion] = useState("");
  const [claveIdempotencia, establecerClaveIdempotencia] = useState(() => window.crypto.randomUUID());
  const [operacion, establecerOperacion] = useState({ procesando: false, error: "", mensaje: "" });
  const [error, establecerError] = useState("");

  useEffect(() => {
    let paginaVigente = true;
    consultarEvento(identificadorUrl)
      .then((datos) => {
        if (paginaVigente) establecerEvento(datos);
      })
      .catch((errorCarga) => {
        if (paginaVigente) {
          establecerError(obtenerMensajeError(errorCarga, "No fue posible cargar el evento solicitado."));
        }
      });
    return () => {
      paginaVigente = false;
    };
  }, [identificadorUrl]);

  useEffect(() => {
    if (!usuario || !evento?.idEvento) {
      establecerInscripcion(null);
      return undefined;
    }
    let vigente = true;
    consultarInscripcionEvento(evento.idEvento)
      .then((datos) => {
        if (vigente) {
          establecerInscripcion(datos);
          establecerEstadoConsulta("lista");
        }
      })
      .catch((errorConsulta) => {
        if (!vigente) return;
        if (errorConsulta instanceof ErrorApi && errorConsulta.estado === 404) {
          establecerInscripcion(null);
          establecerEstadoConsulta("lista");
        } else {
          establecerEstadoConsulta("error");
        }
      });
    return () => {
      vigente = false;
    };
  }, [evento?.idEvento, usuario, reintento]);

  const ahora = new Date();
  const inscripcionAbierta = evento
    && evento.estado === "PUBLICADO"
    && evento.cuposDisponibles > 0
    && new Date(evento.iniciaEn) > ahora
    && (!evento.inscripcionAbreEn || new Date(evento.inscripcionAbreEn) <= ahora)
    && (!evento.inscripcionCierraEn || new Date(evento.inscripcionCierraEn) >= ahora);

  async function confirmarInscripcion(eventoFormulario) {
    eventoFormulario.preventDefault();
    if (operacionEnCurso.current || cargandoSesion || !usuario || estadoConsulta !== "lista" || inscripcion?.estado === "CONFIRMADA" || !inscripcionAbierta) return;
    operacionEnCurso.current = true;
    establecerOperacion({ procesando: true, error: "", mensaje: "" });
    try {
      const confirmada = gruposEvento.length > 0
        ? await inscribirEnEvento(evento.idEvento, claveIdempotencia, respuestasRequisitos, codigoGrupo)
        : await inscribirEnEvento(evento.idEvento, claveIdempotencia, respuestasRequisitos);
      establecerInscripcion(confirmada);
      establecerEvento((actual) => ({ ...actual, cuposDisponibles: confirmada.cuposDisponibles }));
      establecerClaveIdempotencia(window.crypto.randomUUID());
      establecerRespuestasRequisitos({});
      establecerCodigoGrupo("");
      establecerOperacion({ procesando: false, error: "", mensaje: "Tu inscripción quedó confirmada." });
    } catch (errorOperacion) {
      establecerOperacion({ procesando: false, error: errorOperacion.message, mensaje: "" });
    } finally {
      operacionEnCurso.current = false;
    }
  }

  async function cancelarInscripcion(eventoFormulario) {
    eventoFormulario.preventDefault();
    if (operacionEnCurso.current || estadoConsulta !== "lista" || inscripcion?.estado !== "CONFIRMADA") return;
    operacionEnCurso.current = true;
    establecerOperacion({ procesando: true, error: "", mensaje: "" });
    try {
      const cancelada = await cancelarInscripcionEvento(evento.idEvento, motivoCancelacion);
      establecerInscripcion(cancelada);
      establecerEvento((actual) => ({ ...actual, cuposDisponibles: cancelada.cuposDisponibles }));
      establecerMotivoCancelacion("");
      establecerRespuestasRequisitos({});
      establecerOperacion({ procesando: false, error: "", mensaje: "La inscripción fue cancelada." });
    } catch (errorOperacion) {
      establecerOperacion({ procesando: false, error: errorOperacion.message, mensaje: "" });
    } finally {
      operacionEnCurso.current = false;
    }
  }

  function actualizarRespuesta(idCampo, valor) {
    establecerRespuestasRequisitos((actuales) => ({ ...actuales, [idCampo]: valor }));
  }

  const requisitosFormulario = interpretarRequisitos(evento?.esquemaFormularioJson);
  const gruposEvento = interpretarGrupos(evento?.configuracionGruposJson);
  const edadEnEvento = calcularEdad(usuario?.fechaNacimiento, evento?.iniciaEn);
  const gruposDisponibles = edadEnEvento === null ? gruposEvento : gruposEvento.filter((grupo) => (
    (grupo.edadMinima === null || grupo.edadMinima === undefined || edadEnEvento >= Number(grupo.edadMinima))
    && (grupo.edadMaxima === null || grupo.edadMaxima === undefined || edadEnEvento <= Number(grupo.edadMaxima))
  ));

  return (
    <>
      <header className="detalle-evento-cabecera">
        <div className="portal-contenedor">
          <Link className="portal-enlace-ver" to="/eventos">← Eventos y cursos</Link>
          <p className="portal-sobrelinea">Agenda del parque</p>
          <h1>{formatearTextoEditorial(evento?.titulo || "Eventos y cursos")}</h1>
        </div>
      </header>
      <section className="portal-seccion detalle-evento-seccion">
        <article className="portal-contenedor portal-detalle-publico">
          {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          {!error && !evento && <p>Cargando evento…</p>}
          {evento && (
            <>
              <div className={`detalle-evento-resumen${evento.urlImagen ? "" : " sin-imagen"}`}>
              {evento.urlImagen && <img className="portal-imagen-evento" src={evento.urlImagen} alt={evento.titulo} />}
              <div>
              <dl className="portal-datos-detalle">
                <div><dt>Fecha y hora</dt><dd>{formatoFecha.format(new Date(evento.iniciaEn))}</dd></div>
                <div><dt>Lugar</dt><dd>{evento.lugar || "Información pendiente de actualización"}</dd></div>
                <div><dt>Cupos disponibles</dt><dd>{evento.cuposDisponibles} de {evento.capacidadTotal}</dd></div>
              </dl>
              </div>
              </div>
              <div className="detalle-evento-descripcion">
                {evento.descripcion?.split(/\n\s*\n/).map((parrafo, indice) => <p key={indice}>{parrafo.split(/(https?:\/\/[^\s]+)/g).map((parte, i) => /^https?:\/\//.test(parte) ? <a key={i} href={parte} target="_blank" rel="noopener noreferrer">{parte.includes("creativecommons.org") ? "Licencia de la fotografía" : "Ver fuente"}</a> : parte)}</p>)}
              </div>
              {gruposEvento.length > 0 && (
                <section className="portal-grupos-evento" aria-labelledby="titulo-grupos-evento">
                  <h2 id="titulo-grupos-evento">Grupos y horarios</h2>
                  <div className="portal-lista-grupos-evento">
                    {gruposEvento.map((grupo) => <article key={grupo.codigo}><h3>{grupo.nombre}</h3><p>{grupo.categoriaEdad}</p><ul>{grupo.horarios.map((horario, indice) => <li key={`${grupo.codigo}-${indice}`}><strong>{nombresDias[horario.dia] || horario.dia}</strong>: {horario.horaInicio} a {horario.horaFin}{horario.lugar ? ` · ${horario.lugar}` : ""}</li>)}</ul></article>)}
                  </div>
                </section>
              )}
              {evento.imagenesSecundarias?.length > 0 && (
                <section className="portal-galeria-evento" aria-labelledby="titulo-galeria-evento">
                  <h2 id="titulo-galeria-evento">Galería del evento</h2>
                  <div>
                    {evento.imagenesSecundarias.map((imagen) => (
                      <img
                        key={imagen.idImagenEvento}
                        src={imagen.url}
                        alt={imagen.descripcionAccesible}
                        width={imagen.anchoPixeles}
                        height={imagen.altoPixeles}
                        loading="lazy"
                      />
                    ))}
                  </div>
                </section>
              )}
              <section className="portal-inscripcion-evento" aria-labelledby="titulo-inscripcion-evento">
                <h2 id="titulo-inscripcion-evento">Inscripción</h2>
                {operacion.error && <p className="portal-mensaje-error" role="alert">{operacion.error}</p>}
                {operacion.mensaje && <p className="portal-mensaje-exito" role="status">{operacion.mensaje}</p>}
                {(cargandoSesion || (usuario && estadoConsulta === "cargando")) && <p role="status">Consultando tu inscripción…</p>}
                {usuario && estadoConsulta === "error" && <div><p role="alert">No pudimos consultar tu inscripción. Inténtalo nuevamente.</p><button type="button" onClick={() => { establecerEstadoConsulta("cargando"); establecerReintento((actual) => actual + 1); }}>Reintentar</button></div>}
                {usuario && estadoConsulta === "lista" && inscripcion?.estado === "CONFIRMADA" && (
                  <div className="portal-confirmacion-inscripcion">
                    <p className="detalle-evento-estado"><strong>Ya estás inscrito en esta actividad</strong></p>
                    <p>Tu cupo está reservado para esta actividad.</p>
                    {inscripcion.confirmadaEn && <p>Inscripción realizada el {formatoFecha.format(new Date(inscripcion.confirmadaEn))}</p>}
                    {inscripcion.nombreGrupo && <p>Grupo: <strong>{inscripcion.nombreGrupo}</strong></p>}
                    <p><Link className="portal-enlace-ver" to="/mis-inscripciones">Ver mis inscripciones</Link></p>
                    <form onSubmit={cancelarInscripcion}>
                      <label htmlFor="motivoCancelacion">Motivo de cancelación (opcional)</label>
                      <input id="motivoCancelacion" maxLength="300" value={motivoCancelacion} onChange={(eventoCampo) => establecerMotivoCancelacion(eventoCampo.target.value)} />
                      <button className="detalle-evento-cancelar" type="submit" disabled={operacion.procesando}>{operacion.procesando ? "Cancelando…" : "Cancelar mi inscripción"}</button>
                    </form>
                  </div>
                )}
                {!cargandoSesion && !usuario && (
                  <p><Link className="portal-enlace-ver" to="/iniciar-sesion">Inicia sesión para inscribirte</Link></p>
                )}
                {usuario && !cargandoSesion && estadoConsulta === "lista" && inscripcion?.estado !== "CONFIRMADA" && inscripcionAbierta && (
                  <form className="portal-formulario-inscripcion" onSubmit={confirmarInscripcion}>
                    <p>{inscripcion?.estado === "CANCELADA" ? "Tu inscripción anterior fue cancelada. Puedes volver a inscribirte." : "Aún no estás inscrito en esta actividad."}</p>
                    {gruposEvento.length > 0 && <>
                      {edadEnEvento !== null && <p className="nota-formulario-administracion">Según la fecha de nacimiento de tu cuenta, tienes {edadEnEvento} años para la fecha de esta actividad. Solo mostramos los grupos que corresponden a tu edad.</p>}
                      {edadEnEvento === null && <p className="portal-mensaje-error">Agrega tu fecha de nacimiento en Mi perfil para mostrar los grupos adecuados.</p>}
                      {gruposDisponibles.length > 0
                        ? <label htmlFor="grupoEvento">Grupo o categoría *<select id="grupoEvento" required value={codigoGrupo} onChange={(eventoCampo) => establecerCodigoGrupo(eventoCampo.target.value)}><option value="">Selecciona un grupo</option>{gruposDisponibles.map((grupo) => <option key={grupo.codigo} value={grupo.codigo}>{grupo.nombre} · {grupo.categoriaEdad}</option>)}</select></label>
                        : <p className="portal-mensaje-error" role="alert">No hay un grupo disponible para tu edad en esta actividad.</p>}
                    </>}
                    {requisitosFormulario.length > 0 && <h3>Requisitos para la inscripción</h3>}
                    {requisitosFormulario.map((campo) => (
                      <label key={campo.id} htmlFor={`requisito-${campo.id}`}>
                        {campo.etiqueta}{campo.obligatorio ? " *" : ""}
                        <CampoRequisito campo={campo} valor={respuestasRequisitos[campo.id]} alCambiar={actualizarRespuesta} />
                      </label>
                    ))}
                    <button type="submit" disabled={operacion.procesando || (gruposEvento.length > 0 && gruposDisponibles.length === 0)}>{operacion.procesando ? "Confirmando…" : "Confirmar inscripción"}</button>
                  </form>
                )}
                {usuario && !cargandoSesion && estadoConsulta === "lista" && inscripcion?.estado !== "CONFIRMADA" && !inscripcionAbierta && (
                  <p>La inscripción no está disponible en este momento.</p>
                )}
              </section>
            </>
          )}
          <Link className="portal-enlace-ver" to="/eventos">Volver a eventos</Link>
        </article>
      </section>
    </>
  );
}
