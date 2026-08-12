import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [mostrarEdicion, establecerMostrarEdicion] = useState(false);
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
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Contenido institucional</h1>
      <p>Administra la información que se muestra en la sección Nosotros.</p>
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
      <div className="acciones-superiores-administracion">
        <button className={mostrarEdicion ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarEdicion} onClick={() => establecerMostrarEdicion((actual) => !actual)}>{mostrarEdicion ? "Ocultar Contenido" : "Editar contenido"}</button>
      </div>
      {estado.cargando ? <p className="estado-carga">Cargando contenido institucional…</p> : mostrarEdicion && (
        <section className="panel-edicion" aria-labelledby="titulo-edicion-institucional">
          <h2 id="titulo-edicion-institucional">Misión, visión y valores</h2>
          <form className="formulario-administracion formulario-institucional" onSubmit={guardar}>
            <label htmlFor="resumenInstitucional">Resumen institucional</label>
            <textarea id="resumenInstitucional" required maxLength="1000" rows="4" value={contenido.resumen} onChange={(evento) => establecerContenido({ ...contenido, resumen: evento.target.value })} />
            <label htmlFor="misionInstitucional">Misión</label>
            <textarea id="misionInstitucional" required maxLength="4000" rows="6" value={contenido.mision} onChange={(evento) => establecerContenido({ ...contenido, mision: evento.target.value })} />
            <label htmlFor="visionInstitucional">Visión</label>
            <textarea id="visionInstitucional" required maxLength="4000" rows="6" value={contenido.vision} onChange={(evento) => establecerContenido({ ...contenido, vision: evento.target.value })} />
            <label htmlFor="valoresInstitucional">Valores</label>
            <textarea id="valoresInstitucional" required maxLength="4000" rows="6" value={contenido.valores} onChange={(evento) => establecerContenido({ ...contenido, valores: evento.target.value })} />
            <button type="submit" disabled={estado.guardando}>{estado.guardando ? "Guardando…" : "Guardar contenido institucional"}</button>
          </form>
        </section>
      )}
    </main>
  );
}
