import { CabeceraAdministracion } from "../componentes/CabeceraAdministracion";
import { useEffect, useState } from "react";

import {
  actualizarContenidoInstitucional,
  consultarContenidoInstitucionalAdministrado,
} from "../api/administracionInstitucional";

const contenidoVacio = {
  resumen: "",
  mision: "",
  vision: "",
  valores: "",
  version: null,
};

export function PaginaAdministracionInstitucional() {
  const [contenido, establecerContenido] = useState(contenidoVacio);
  const [mostrarEdicion, establecerMostrarEdicion] = useState(true);
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  useEffect(() => {
    let vigente = true;
    consultarContenidoInstitucionalAdministrado()
      .then((contenidoRecibido) => {
        if (!vigente) return;
        establecerContenido(contenidoRecibido);
        establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
      })
      .catch((error) => {
        if (vigente) establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function guardar(evento) {
    evento.preventDefault();
    establecerEstado({ cargando: false, guardando: true, error: "", mensaje: "" });
    try {
      const contenidoActualizado = await actualizarContenidoInstitucional(contenido);
      establecerContenido(contenidoActualizado);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Contenido institucional actualizado." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  return (
    <main className="pagina-administracion pagina-administracion-institucional">
      <CabeceraAdministracion titulo="Contenido institucional" descripcion="Administra la información que se muestra en la sección Nosotros." />
      <div className="disposicion-modulo-administracion">
        <nav className="navegacion-modulo-administracion" aria-label="Opciones de Contenido institucional">
            <div className="acciones-superiores-administracion">
              <button className={mostrarEdicion ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarEdicion} onClick={() => establecerMostrarEdicion(true)}>Editar contenido</button>
            </div>
        </nav>
        <div className="contenido-modulo-administracion">
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
      {estado.cargando ? <p className="estado-carga">Cargando contenido institucional…</p> : mostrarEdicion && (
        <section className="panel-edicion" aria-labelledby="titulo-edicion-institucional">
          <div className="cabecera-panel-administracion">
            <div>
              <h2 id="titulo-edicion-institucional">Información institucional</h2>
              <p>Estos textos se publican en la sección Nosotros del portal.</p>
            </div>
          </div>
          <form className="formulario-administracion formulario-institucional" onSubmit={guardar}>
            <fieldset className="seccion-contenido-institucional">
              <legend>Presentación pública</legend>
              <label htmlFor="resumenInstitucional">Resumen institucional</label>
              <textarea id="resumenInstitucional" required maxLength="1000" rows="4" value={contenido.resumen} onChange={(evento) => establecerContenido({ ...contenido, resumen: evento.target.value })} />
            </fieldset>
            <fieldset className="seccion-contenido-institucional">
              <legend>Propósito y valores</legend>
              <label htmlFor="misionInstitucional">Misión</label>
              <textarea id="misionInstitucional" required maxLength="4000" rows="5" value={contenido.mision} onChange={(evento) => establecerContenido({ ...contenido, mision: evento.target.value })} />
              <label htmlFor="visionInstitucional">Visión</label>
              <textarea id="visionInstitucional" required maxLength="4000" rows="5" value={contenido.vision} onChange={(evento) => establecerContenido({ ...contenido, vision: evento.target.value })} />
              <label htmlFor="valoresInstitucional">Valores</label>
              <textarea id="valoresInstitucional" required maxLength="4000" rows="4" value={contenido.valores} onChange={(evento) => establecerContenido({ ...contenido, valores: evento.target.value })} />
            </fieldset>
            <button type="submit" disabled={estado.guardando}>{estado.guardando ? "Guardando…" : "Guardar contenido institucional"}</button>
          </form>
        </section>
      )}
        </div>
      </div>
    </main>
  );
}
