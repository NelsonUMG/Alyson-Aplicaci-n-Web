import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorApi } from "../api/clienteHttp";
import {
  cancelarInscripcionEvento,
  consultarInscripcionEvento,
  inscribirEnEvento,
} from "../api/inscripcionesEventos";
import { consultarEvento } from "../api/portalPublico";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

export function PaginaDetalleEvento() {
  const { identificadorUrl } = useParams();
  const { usuario, cargando: cargandoSesion } = usarSesion();
  const [evento, establecerEvento] = useState(null);
  const [inscripcion, establecerInscripcion] = useState(null);
  const [aceptaRequisitos, establecerAceptaRequisitos] = useState(false);
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
      .catch(() => {
        if (paginaVigente) establecerError("No fue posible cargar el evento solicitado.");
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
        if (vigente) establecerInscripcion(datos);
      })
      .catch((errorConsulta) => {
        if (vigente && (!(errorConsulta instanceof ErrorApi) || errorConsulta.estado !== 404)) {
          establecerOperacion({ procesando: false, error: errorConsulta.message, mensaje: "" });
        }
      });
    return () => {
      vigente = false;
    };
  }, [evento?.idEvento, usuario]);

  const ahora = new Date();
  const inscripcionAbierta = evento
    && evento.estado === "PUBLICADO"
    && evento.cuposDisponibles > 0
    && new Date(evento.iniciaEn) > ahora
    && (!evento.inscripcionAbreEn || new Date(evento.inscripcionAbreEn) <= ahora)
    && (!evento.inscripcionCierraEn || new Date(evento.inscripcionCierraEn) >= ahora);

  async function confirmarInscripcion(eventoFormulario) {
    eventoFormulario.preventDefault();
    establecerOperacion({ procesando: true, error: "", mensaje: "" });
    try {
      const confirmada = await inscribirEnEvento(evento.idEvento, claveIdempotencia);
      establecerInscripcion(confirmada);
      establecerEvento((actual) => ({ ...actual, cuposDisponibles: confirmada.cuposDisponibles }));
      establecerClaveIdempotencia(window.crypto.randomUUID());
      establecerOperacion({ procesando: false, error: "", mensaje: "Tu inscripción quedó confirmada." });
    } catch (errorOperacion) {
      establecerOperacion({ procesando: false, error: errorOperacion.message, mensaje: "" });
    }
  }

  async function cancelarInscripcion(eventoFormulario) {
    eventoFormulario.preventDefault();
    establecerOperacion({ procesando: true, error: "", mensaje: "" });
    try {
      const cancelada = await cancelarInscripcionEvento(evento.idEvento, motivoCancelacion);
      establecerInscripcion(cancelada);
      establecerEvento((actual) => ({ ...actual, cuposDisponibles: cancelada.cuposDisponibles }));
      establecerMotivoCancelacion("");
      establecerAceptaRequisitos(false);
      establecerOperacion({ procesando: false, error: "", mensaje: "La inscripción fue cancelada." });
    } catch (errorOperacion) {
      establecerOperacion({ procesando: false, error: errorOperacion.message, mensaje: "" });
    }
  }

  return (
    <>
      <CabeceraPagina
        etiqueta={evento?.estado || "Agenda del parque"}
        titulo={evento?.titulo || "Eventos y cursos"}
        descripcion={evento?.descripcion || "Actividades, requisitos, cupos y periodos de inscripción."}
      />
      <section className="portal-seccion">
        <article className="portal-contenedor portal-detalle-publico">
          {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          {!error && !evento && <p>Cargando evento…</p>}
          {evento && (
            <>
              {evento.urlImagen && <img className="portal-imagen-evento" src={evento.urlImagen} alt={evento.titulo} loading="lazy" />}
              <dl className="portal-datos-detalle">
                <div><dt>Fecha y hora</dt><dd>{formatoFecha.format(new Date(evento.iniciaEn))}</dd></div>
                <div><dt>Lugar</dt><dd>{evento.lugar || "Información pendiente de actualización"}</dd></div>
                <div><dt>Cupos disponibles</dt><dd>{evento.cuposDisponibles} de {evento.capacidadTotal}</dd></div>
              </dl>
              {evento.requisitos.length > 0 && (
                <div className="portal-requisitos">
                  <h2>Requisitos</h2>
                  <ul>
                    {evento.requisitos.map((requisito) => (
                      <li key={`${requisito.descripcion}-${requisito.obligatorio}`}>
                        {requisito.descripcion}{requisito.obligatorio ? " (obligatorio)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <section className="portal-inscripcion-evento" aria-labelledby="titulo-inscripcion-evento">
                <h2 id="titulo-inscripcion-evento">Inscripción</h2>
                {operacion.error && <p className="portal-mensaje-error" role="alert">{operacion.error}</p>}
                {operacion.mensaje && <p className="portal-mensaje-exito" role="status">{operacion.mensaje}</p>}
                {inscripcion?.estado === "CONFIRMADA" && (
                  <div className="portal-confirmacion-inscripcion">
                    <p><strong>Inscripción confirmada</strong></p>
                    <p>Tu cupo está reservado para esta actividad.</p>
                    <form onSubmit={cancelarInscripcion}>
                      <label htmlFor="motivoCancelacion">Motivo de cancelación (opcional)</label>
                      <input id="motivoCancelacion" maxLength="300" value={motivoCancelacion} onChange={(eventoCampo) => establecerMotivoCancelacion(eventoCampo.target.value)} />
                      <button type="submit" disabled={operacion.procesando}>Cancelar mi inscripción</button>
                    </form>
                  </div>
                )}
                {!cargandoSesion && !usuario && (
                  <p><Link className="portal-enlace-ver" to="/iniciar-sesion">Inicia sesión para inscribirte</Link></p>
                )}
                {usuario && inscripcion?.estado !== "CONFIRMADA" && inscripcionAbierta && (
                  <form className="portal-formulario-inscripcion" onSubmit={confirmarInscripcion}>
                    <label><input type="checkbox" checked={aceptaRequisitos} onChange={(eventoCampo) => establecerAceptaRequisitos(eventoCampo.target.checked)} /> Confirmo que revisé y acepto los requisitos de la actividad.</label>
                    <button type="submit" disabled={!aceptaRequisitos || operacion.procesando}>Confirmar inscripción</button>
                  </form>
                )}
                {usuario && inscripcion?.estado !== "CONFIRMADA" && !inscripcionAbierta && (
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
