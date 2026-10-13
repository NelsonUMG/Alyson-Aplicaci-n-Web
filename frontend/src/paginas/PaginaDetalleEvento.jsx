import { AvisoEnContexto } from "../componentes/AvisosEnContexto";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorApi, obtenerMensajeError } from "../api/clienteHttp";
import {
  cancelarInscripcionEvento,
  consultarInscripcionEvento,
  inscribirEnEvento,
} from "../api/inscripcionesEventos";
import { consultarEvento } from "../api/portalPublico";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { obtenerPerfil } from "../api/autenticacion";
import { formatearTextoEditorial } from "../utilidades/formatoTexto";

import { CampoFotoEstudiante } from "../componentes/CampoFotoEstudiante";

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

function interpretarRequisitos(esquemaFormularioJson) {
  if (!esquemaFormularioJson) return [];
  try {
    const esquema = JSON.parse(esquemaFormularioJson);
    return Array.isArray(esquema.campos) ? esquema.campos.map((campo) => ({ ...campo,
      tipo: campo.tipo === "FOTO" || /\b(foto|fotografia|fotografias)\b/i.test((campo.etiqueta || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ? "FOTO" : campo.tipo,
    })) : [];
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

function requisitoValido(campo, valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return !campo.obligatorio;
  if (campo.tipo === "FOTO") return /^data:image\/(jpeg|png);base64,/.test(texto);
  if (campo.tipo === "DPI_CUI") return /^[0-9]{13}$/.test(texto);
  if (campo.tipo === "NUMERO") return Number.isFinite(Number(texto));
  if (campo.tipo === "FECHA") return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(new Date(texto).getTime());
  if (campo.tipo === "SI_NO") return ["true", "false"].includes(texto);
  if (campo.tipo === "SELECCION_UNICA") return (campo.opciones || []).includes(texto);
  return texto.length <= (campo.tipo === "TEXTO_LARGO" ? 5000 : 500);
}

function CampoRequisito({ campo, valor, alCambiar }) {
  const propiedades = {
    id: `requisito-${campo.id}`,
    required: campo.obligatorio,
    value: valor ?? "",
    onChange: (evento) => alCambiar(campo.id, evento.target.value),
  };
  if (campo.tipo === "FOTO") return <CampoFotoEstudiante campo={campo} valor={valor} alCambiar={alCambiar} />;
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
  const { usuario, cargando: cargandoSesion, actualizarUsuario } = usarSesion();
  const idUsuario = usuario?.idUsuario;
  const [estadoPerfil, setEstadoPerfil] = useState({ cargando: false, error: "" });
  useEffect(() => {
    if (!idUsuario || !actualizarUsuario) return;
    let vigente = true;
    setEstadoPerfil({ cargando: true, error: "" });
    obtenerPerfil().then((perfil) => {
      if (vigente) { actualizarUsuario(perfil); setEstadoPerfil({ cargando: false, error: "" }); }
    }).catch((error) => {
      if (vigente) setEstadoPerfil({ cargando: false, error: error.message });
    });
    return () => { vigente = false; };
  }, [idUsuario, identificadorUrl, actualizarUsuario]);
  return <>
    {estadoPerfil.error && <AvisoEnContexto role="alert" className="portal-mensaje-error">No se pudo actualizar tu perfil: {estadoPerfil.error}</AvisoEnContexto>}
    <DetalleEvento key={`${identificadorUrl}:${usuario?.idUsuario ?? usuario?.correo ?? "visitante"}`} identificadorUrl={identificadorUrl} usuario={usuario} cargandoSesion={cargandoSesion || estadoPerfil.cargando} />
  </>;
}

function DetalleEvento({ identificadorUrl, usuario, cargandoSesion }) {
  const [parametros] = useSearchParams();
  const idInscripcionSeleccionada = parametros.get("inscripcion");
  const [paraHijo, setParaHijo] = useState(false);
  const [participante, setParticipante] = useState({ nombre: "", apellido: "", fechaNacimiento: "" });
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
    (idInscripcionSeleccionada ? consultarInscripcionEvento(evento.idEvento, idInscripcionSeleccionada) : consultarInscripcionEvento(evento.idEvento))
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
  }, [evento?.idEvento, usuario, reintento, idInscripcionSeleccionada]);

  const ahora = new Date();
  const inscripcionAbierta = evento
    && evento.estado === "PUBLICADO"
    && evento.cuposDisponibles > 0
    && (evento.cursoContinuo ? (!evento.finalizaEn || new Date(evento.finalizaEn) > ahora) : new Date(evento.iniciaEn) > ahora)
    && (!evento.inscripcionAbreEn || new Date(evento.inscripcionAbreEn) <= ahora)
    && (!evento.inscripcionCierraEn || new Date(evento.inscripcionCierraEn) >= ahora);

  async function confirmarInscripcion(eventoFormulario) {
    eventoFormulario.preventDefault();
    if (operacionEnCurso.current || cargandoSesion || !usuario || estadoConsulta !== "lista" || inscripcion?.estado === "CONFIRMADA" || !inscripcionAbierta || !formularioValido || !eventoFormulario.currentTarget.checkValidity()) return;
    operacionEnCurso.current = true;
    establecerOperacion({ procesando: true, error: "", mensaje: "" });
    try {
      const confirmada = paraHijo
        ? await inscribirEnEvento(evento.idEvento, claveIdempotencia, respuestasRequisitos, codigoGrupo || null, participante)
        : gruposEvento.length > 0
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
      const cancelada = await cancelarInscripcionEvento(evento.idEvento, motivoCancelacion, inscripcion.idInscripcionEvento);
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

  const requisitosFormulario = interpretarRequisitos(evento?.esquemaFormularioJson).map((campo) => ({
    ...campo, obligatorio: campo.obligatorio || (paraHijo && campo.tipo === "FOTO"),
    etiqueta: paraHijo && campo.tipo === "FOTO" ? "Sube la fotografía del niño(a) a inscribir" : campo.etiqueta,
  }));
  if (paraHijo && !requisitosFormulario.some((campo) => campo.tipo === "FOTO")) {
    requisitosFormulario.unshift({ id: "_fotoParticipante", tipo: "FOTO", etiqueta: "Sube la fotografía del niño(a) a inscribir", obligatorio: true });
  }
  const gruposEvento = interpretarGrupos(evento?.configuracionGruposJson);
  const fechaReferencia = evento?.cursoContinuo && new Date(evento.iniciaEn) < ahora ? ahora.toISOString() : evento?.iniciaEn;
  const edadEnEvento = calcularEdad(paraHijo ? participante.fechaNacimiento : usuario?.fechaNacimiento, fechaReferencia);
  const gruposDisponibles = edadEnEvento === null ? gruposEvento : gruposEvento.filter((grupo) => (
    (grupo.edadMinima === null || grupo.edadMinima === undefined || edadEnEvento >= Number(grupo.edadMinima))
    && (grupo.edadMaxima === null || grupo.edadMaxima === undefined || edadEnEvento <= Number(grupo.edadMaxima))
  ));
  const grupoSeleccionado = gruposEvento.find((grupo) => grupo.codigo === codigoGrupo);
  const edadRequerida = grupoSeleccionado && (grupoSeleccionado.edadMinima != null || grupoSeleccionado.edadMaxima != null);
  const grupoValido = gruposEvento.length === 0 || (grupoSeleccionado && (!edadRequerida || edadEnEvento !== null)
    && gruposDisponibles.some((grupo) => grupo.codigo === codigoGrupo));
  const nacimientoValido = participante.fechaNacimiento && !Number.isNaN(new Date(participante.fechaNacimiento).getTime())
    && participante.fechaNacimiento <= new Date().toLocaleDateString("en-CA");
  const participanteValido = !paraHijo || (participante.nombre.trim() && participante.apellido.trim() && nacimientoValido);
  const formularioValido = Boolean(grupoValido && participanteValido
    && requisitosFormulario.every((campo) => requisitoValido(campo, respuestasRequisitos[campo.id])));

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
          {error && <AvisoEnContexto className="portal-mensaje-error" role="alert">{error}</AvisoEnContexto>}
          {!error && !evento && <p>Cargando evento…</p>}
          {evento && (
            <>
              <div className={`detalle-evento-resumen${evento.urlImagen ? "" : " sin-imagen"}`}>
              {evento.urlImagen && <img className="portal-imagen-evento" src={evento.urlImagen} alt={evento.titulo} />}
              <div>
              <dl className="portal-datos-detalle">
                <div><dt>Fecha y hora</dt><dd>{formatoFecha.format(new Date(evento.iniciaEn))}</dd></div>
                {evento.cursoContinuo && <div><dt>Duración</dt><dd>{evento.finalizaEn ? `Curso continuo hasta ${formatoFecha.format(new Date(evento.finalizaEn))}` : "Curso continuo · sin fecha de finalización"}</dd></div>}
                <div><dt>Lugar</dt><dd>{evento.lugar || "Información pendiente de actualización"}</dd></div>
                {evento.urlFormularioInscripcion && <div><dt>Formulario</dt><dd><a href={evento.urlFormularioInscripcion} download>Descargar</a></dd></div>}
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
                {evento.urlFormularioInscripcion && <p><strong>Formulario: </strong><a className="portal-enlace-ver" href={evento.urlFormularioInscripcion} download>Descargar</a></p>}
                {operacion.error && <AvisoEnContexto className="portal-mensaje-error" role="alert">{operacion.error}</AvisoEnContexto>}
                {operacion.mensaje && <AvisoEnContexto className="portal-mensaje-exito" role="status">{operacion.mensaje}</AvisoEnContexto>}
                {(cargandoSesion || (usuario && estadoConsulta === "cargando")) && <p role="status">Consultando tu inscripción…</p>}
                {usuario && estadoConsulta === "error" && <div><p role="alert">No pudimos consultar tu inscripción. Inténtalo nuevamente.</p><button type="button" onClick={() => { establecerEstadoConsulta("cargando"); establecerReintento((actual) => actual + 1); }}>Reintentar</button></div>}
                {usuario && estadoConsulta === "lista" && inscripcion?.estado === "CONFIRMADA" && (
                  <div className="portal-confirmacion-inscripcion">
                    <p className="detalle-evento-estado"><strong>Inscripción confirmada en esta actividad</strong></p>
                    <p>Participante: <strong>{inscripcion.nombreParticipante ? `${inscripcion.nombreParticipante} ${inscripcion.apellidoParticipante || ""}` : "Titular de la cuenta"}</strong>. Su cupo está reservado.</p>
                    {inscripcion.confirmadaEn && <p>Inscripción realizada el {formatoFecha.format(new Date(inscripcion.confirmadaEn))}</p>}
                    {inscripcion.nombreGrupo && <p>Grupo: <strong>{inscripcion.nombreGrupo}</strong></p>}
                    <p><Link className="portal-enlace-ver" to="/mis-inscripciones">Ver mis inscripciones</Link></p>
                    {inscripcionAbierta && <button type="button" onClick={() => { establecerInscripcion(null); setParaHijo(true); setParticipante({ nombre: "", apellido: "", fechaNacimiento: "" }); establecerOperacion({ procesando: false, error: "", mensaje: "" }); }}>Inscribir a otro niño(a)</button>}
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
                    <fieldset className="selector-participante"><legend>¿Quién participará?</legend>
                      <div className="opciones-participante">
                      <label><input type="radio" name="participante" checked={!paraHijo} onChange={() => { setParaHijo(false); establecerCodigoGrupo(""); establecerRespuestasRequisitos({}); }} />Yo</label>
                      <label><input type="radio" name="participante" checked={paraHijo} onChange={() => { setParaHijo(true); establecerCodigoGrupo(""); establecerRespuestasRequisitos({}); }} />Un(a) niño(a)</label>
                      </div>
                      {paraHijo && <>
                        <label>Nombre del estudiante<input required maxLength="120" value={participante.nombre} onChange={(e) => setParticipante({ ...participante, nombre: e.target.value })} /></label>
                        <label>Apellido del estudiante<input required maxLength="120" value={participante.apellido} onChange={(e) => setParticipante({ ...participante, apellido: e.target.value })} /></label>
                        <label>Fecha de nacimiento del estudiante<input type="date" required max={new Date().toLocaleDateString("en-CA")} value={participante.fechaNacimiento} onChange={(e) => { setParticipante({ ...participante, fechaNacimiento: e.target.value }); establecerCodigoGrupo(""); }} /></label>
                      </>}
                    </fieldset>
                    {gruposEvento.length > 0 && <>
                      {edadEnEvento !== null && <p className="nota-formulario-administracion">{paraHijo ? "El niño(a) tiene" : "Tienes"} {edadEnEvento} años para esta inscripción.</p>}
                      <label htmlFor="grupoEvento">Grupo o categoría *<select id="grupoEvento" required value={codigoGrupo} onChange={(eventoCampo) => establecerCodigoGrupo(eventoCampo.target.value)}><option value="">Selecciona un grupo</option>{gruposEvento.map((grupo) => <option key={grupo.codigo} value={grupo.codigo}>{grupo.nombre} · {grupo.categoriaEdad}</option>)}</select></label>
                      {grupoSeleccionado && edadRequerida && edadEnEvento === null && <p className="portal-mensaje-error" role="alert">{paraHijo ? "Ingresa la fecha de nacimiento del niño(a) para comprobar el grupo." : "Tu cuenta no tiene una fecha de nacimiento guardada. Actualízala en Mi perfil para comprobar la edad."}</p>}
                      {grupoSeleccionado && edadEnEvento !== null && !grupoValido && <p className="portal-mensaje-error" role="alert">{paraHijo ? "El niño(a) no puede inscribirse" : "No puedes inscribirte"} en este grupo: no cumple{paraHijo ? "" : "s"} el rango de edad {grupoSeleccionado.categoriaEdad || `${grupoSeleccionado.edadMinima ?? "sin mínimo"} a ${grupoSeleccionado.edadMaxima ?? "sin máximo"} años`}.</p>}
                    </>}
                    {requisitosFormulario.length > 0 && <h3>Requisitos para la inscripción</h3>}
                    {requisitosFormulario.map((campo) => (
                      <label key={`${paraHijo ? "nino" : "yo"}:${campo.id}`} htmlFor={`requisito-${campo.id}`}>
                        {campo.etiqueta}{campo.obligatorio ? " *" : ""}
                        <CampoRequisito campo={campo} valor={respuestasRequisitos[campo.id]} alCambiar={actualizarRespuesta} />
                      </label>
                    ))}
                    <button type="submit" disabled={operacion.procesando || !formularioValido}>{operacion.procesando ? "Confirmando…" : "Confirmar inscripción"}</button>
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
