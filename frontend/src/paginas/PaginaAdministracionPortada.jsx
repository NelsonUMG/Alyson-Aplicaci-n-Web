import { useEffect, useState } from "react";
import { consultarPortada, guardarPortada } from "../api/configuracionPortada";
import { CabeceraAdministracion } from "../componentes/CabeceraAdministracion";
import { textoSobreColor, usarPortada } from "../componentes/ContextoPortada";

const ANCHO_MINIMO_PORTADA = 1280;
const ALTO_MINIMO_PORTADA = 720;
const RELACION_PORTADA = 16 / 9;
const TOLERANCIA_RELACION_PORTADA = 0.03;

export function PaginaAdministracionPortada() {
  const { actualizarConfiguracion } = usarPortada();
  const [datos, establecerDatos] = useState(null);
  const [imagen, establecerImagen] = useState(null);
  const [urlLocal, establecerUrlLocal] = useState("");
  const [quitarPortada, establecerQuitarPortada] = useState(false);
  const [estado, establecerEstado] = useState({ error: "", mensaje: "", guardando: false });
  useEffect(() => {
    let vigente = true;
    consultarPortada().then((respuesta) => { if (vigente) establecerDatos(respuesta); })
      .catch((error) => { if (vigente) establecerEstado({ error: error.message }); });
    return () => { vigente = false; };
  }, []);
  useEffect(() => {
    if (!imagen) { establecerUrlLocal(""); return; }
    const url = window.URL.createObjectURL(imagen);
    establecerUrlLocal(url);
    return () => window.URL.revokeObjectURL(url);
  }, [imagen]);
  async function seleccionarImagen(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (!["image/jpeg", "image/png"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      establecerEstado({ error: "Selecciona una imagen JPG o PNG de hasta 5 MB." });
      evento.target.value = "";
      return;
    }
    const url = window.URL.createObjectURL(archivo);
    try {
      const dimensiones = await new Promise((resolver, rechazar) => {
        const imagen = new window.Image();
        imagen.onload = () => resolver({ ancho: imagen.naturalWidth || imagen.width, alto: imagen.naturalHeight || imagen.height });
        imagen.onerror = () => rechazar(new Error("No fue posible leer la imagen seleccionada."));
        imagen.src = url;
      });
      const relacion = dimensiones.ancho / dimensiones.alto;
      if (dimensiones.ancho < ANCHO_MINIMO_PORTADA
          || dimensiones.alto < ALTO_MINIMO_PORTADA
          || Math.abs(relacion - RELACION_PORTADA) > TOLERANCIA_RELACION_PORTADA) {
        establecerEstado({ error: "La portada debe usar una proporción 16:9 y tener al menos 1280 × 720 píxeles. Se recomienda 1920 × 1080 para verla nítida en pantallas grandes." });
        evento.target.value = "";
        return;
      }
    } catch (error) {
      establecerEstado({ error: error.message });
      evento.target.value = "";
      return;
    } finally {
      window.URL.revokeObjectURL(url);
    }
    establecerImagen(archivo);
    establecerQuitarPortada(false);
    establecerEstado({ mensaje: "Imagen en vista previa. Guarda para publicarla." });
  }
  async function guardar(evento) {
    evento.preventDefault();
    establecerEstado({ guardando: true });
    try {
      const respuesta = await guardarPortada({ colorPrincipal: datos.colorPrincipal, version: datos.version, quitarPortada }, imagen);
      actualizarConfiguracion(respuesta);
      establecerDatos(respuesta);
      establecerImagen(null);
      establecerQuitarPortada(false);
      establecerEstado({ mensaje: "Página principal actualizada." });
    } catch (error) { establecerEstado({ error: error.message }); }
  }
  async function recargar() {
    establecerEstado({ guardando: true });
    try {
      const respuesta = await consultarPortada();
      establecerDatos(respuesta);
      actualizarConfiguracion(respuesta);
      establecerImagen(null);
      establecerQuitarPortada(false);
      establecerEstado({ mensaje: "Se cargó la configuración guardada." });
    } catch (error) { establecerEstado({ error: error.message }); }
  }
  const portada = quitarPortada ? null : urlLocal || datos?.portadaUrl;
  return <main className="pagina-administracion pagina-configuracion-portada">
    <CabeceraAdministracion titulo="Página principal" descripcion="Cambia el color principal de Inicio y su imagen de portada." />
    {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
    {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
    {!datos ? <><p>{estado.error ? "No se pudo cargar la configuración." : "Cargando configuración…"}</p>{estado.error && <button onClick={recargar}>Reintentar</button>}</> : <form onSubmit={guardar} className="portada-editor">
      <fieldset disabled={estado.guardando} className="portada-controles">
        <legend>Personalizar Inicio</legend>
        <div className="portada-color"><label htmlFor="color-principal">Color principal</label><input id="color-principal" type="color" value={datos.colorPrincipal} onChange={(e) => establecerDatos({ ...datos, colorPrincipal: e.target.value })} /><code>{datos.colorPrincipal}</code></div>
        <p>Se aplica a los botones, las franjas y los detalles de la página de Inicio.</p>
        <label htmlFor="imagen-portada">Imagen de portada</label>
        <input key={`${datos.version}-${quitarPortada}`} id="imagen-portada" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={seleccionarImagen} />
        <p>JPG o PNG, hasta 5 MB y 8000 píxeles por lado. Proporción 16:9; mínimo 1280 × 720 y recomendado 1920 × 1080 para conservar nitidez. Vista previa al seleccionar.</p>
        {imagen && <p>Seleccionada: {imagen.name}</p>}
        {portada && <button type="button" className="boton-secundario" onClick={() => { establecerImagen(null); establecerQuitarPortada(true); }}>Usar portada provisional</button>}
      </fieldset>
      <section className="portada-vista" aria-label="Vista previa en tiempo real">
        <h2>Vista previa</h2>
        <div className="portada-maqueta" style={{ "--inicio-color": datos.colorPrincipal, "--inicio-contraste": textoSobreColor(datos.colorPrincipal) }}>
          <div className="portada-maqueta-barra">Parque Erick Barrondo · Inicio</div>
          <div className="portada-maqueta-imagen" style={{ backgroundImage: `linear-gradient(90deg, #000b, #0004), url("${portada || "/imagenes/portada-parque-provisional.webp"}")` }}>
            <h3>Parque Erick Barrondo</h3><p>Recreación y deporte para todas las personas.</p><span className="portada-boton-muestra">Conoce el parque</span>
            {!portada && <small>Imagen provisional</small>}
          </div>
        </div>
        <p>Los cambios se publican al guardar. Las páginas abiertas se actualizan en un máximo de 15 segundos.</p>
      </section>
      <div className="portada-acciones"><button type="submit" disabled={estado.guardando}>{estado.guardando ? "Guardando…" : "Guardar cambios"}</button><button type="button" className="boton-secundario" disabled={estado.guardando} onClick={recargar}>Descartar cambios / recargar</button></div>
    </form>}
  </main>;
}
