import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarCategoria,
  actualizarPublicacion,
  agregarImagenPublicacion,
  archivarPublicacion,
  crearCategoria,
  crearPublicacion,
  desarchivarPublicacion,
  eliminarCategoria,
  eliminarImagenPublicacion,
  eliminarPublicacion,
  listarCategoriasAdministradas,
  listarImagenesPublicacion,
  listarPublicacionesAdministradas,
  publicarPublicacion,
} from "../api/administracionPublicaciones";
import { usarSesion } from "../autenticacion/ContextoSesion";

const categoriaInicial = {
  idCategoriaPublicacion: null,
  nombre: "",
  descripcion: "",
  ordenVisualizacion: 1,
  activa: true,
  version: null,
};

const publicacionInicial = {
  idPublicacion: null,
  idCategoriaPublicacion: "",
  titulo: "",
  resumen: "",
  contenido: "",
  fechaEditorial: "",
  estado: "BORRADOR",
  version: null,
};

const paginaInicial = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };

function obtenerOrdenesDisponibles(categorias, idCategoriaActual = null, cantidad = 8) {
  const ocupados = new Set(categorias
    .filter((categoria) => categoria.idCategoriaPublicacion !== idCategoriaActual)
    .map((categoria) => Number(categoria.ordenVisualizacion)));
  const disponibles = [];
  for (let candidato = 1; candidato <= 32767 && disponibles.length < cantidad; candidato += 1) {
    if (!ocupados.has(candidato)) disponibles.push(candidato);
  }
  return disponibles;
}

function AreaTextoAutoexpandible({ className = "", value, ...propiedades }) {
  const referencia = useRef(null);

  useLayoutEffect(() => {
    const areaTexto = referencia.current;
    if (!areaTexto) return;
    areaTexto.style.height = "auto";
    if (areaTexto.scrollHeight > 0) {
      const estilos = window.getComputedStyle(areaTexto);
      const bordesVerticales = (Number.parseFloat(estilos.borderTopWidth) || 0)
        + (Number.parseFloat(estilos.borderBottomWidth) || 0);
      areaTexto.style.height = `${areaTexto.scrollHeight + bordesVerticales}px`;
    }
  }, [value]);

  return (
    <textarea
      {...propiedades}
      ref={referencia}
      className={`area-texto-autoexpandible ${className}`.trim()}
      value={value}
    />
  );
}

export function PaginaAdministracionPublicaciones() {
  const { usuario } = usarSesion();
  const [categorias, establecerCategorias] = useState([]);
  const [categoriaEdicion, establecerCategoriaEdicion] = useState(categoriaInicial);
  const [mostrarFormularioCategoria, establecerMostrarFormularioCategoria] = useState(false);
  const [mostrarListadoPublicaciones, establecerMostrarListadoPublicaciones] = useState(false);
  const [pagina, establecerPagina] = useState(paginaInicial);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "", idCategoria: "", orden: "ACTUALIZACION" });
  const [publicacionEdicion, establecerPublicacionEdicion] = useState(null);
  const [imagenes, establecerImagenes] = useState([]);
  const [vistaPreviaImagen, establecerVistaPreviaImagen] = useState(null);
  const [claveCreacion, establecerClaveCreacion] = useState(() => window.crypto.randomUUID());
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  const puedeCrear = usuario.permisos.includes("PUBLICACIONCREAR");
  const puedeActualizar = usuario.permisos.includes("PUBLICACIONACTUALIZAR");
  const puedeArchivar = usuario.permisos.includes("PUBLICACIONELIMINAR");

  useEffect(() => {
    let vigente = true;
    Promise.all([listarCategoriasAdministradas(), listarPublicacionesAdministradas()])
      .then(([catalogo, listado]) => {
        if (!vigente) return;
        establecerCategorias(catalogo);
        establecerPagina(listado);
        establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
      })
      .catch((error) => {
        if (vigente) establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!estado.error) return undefined;

    function ocultarErrorAlHacerClic() {
      establecerEstado((actual) => (actual.error ? { ...actual, error: "" } : actual));
    }

    document.addEventListener("click", ocultarErrorAlHacerClic, { capture: true, once: true });
    return () => document.removeEventListener("click", ocultarErrorAlHacerClic, { capture: true });
  }, [estado.error]);

  async function recargarPublicaciones(numeroPagina = 0) {
    const listado = await listarPublicacionesAdministradas({ ...filtros, pagina: numeroPagina });
    establecerPagina(listado);
  }

  async function aplicarFiltros(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      await recargarPublicaciones(0);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function cambiarPagina(numeroPagina) {
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      await recargarPublicaciones(numeroPagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function nuevaCategoria() {
    cancelarPublicacion();
    establecerMostrarListadoPublicaciones(false);
    establecerCategoriaEdicion({
      ...categoriaInicial,
      ordenVisualizacion: obtenerOrdenesDisponibles(categorias)[0] || 1,
    });
    establecerMostrarFormularioCategoria(true);
  }

  function editarCategoria(categoria) {
    cancelarPublicacion();
    establecerMostrarListadoPublicaciones(false);
    establecerCategoriaEdicion(categoria);
    establecerMostrarFormularioCategoria(true);
  }

  function cancelarCategoria() {
    establecerCategoriaEdicion(categoriaInicial);
    establecerMostrarFormularioCategoria(false);
  }

  function alternarFormularioCategoria() {
    if (mostrarFormularioCategoria) return;
    nuevaCategoria();
  }

  async function guardarCategoria(evento) {
    evento.preventDefault();
    const ordenesDisponibles = obtenerOrdenesDisponibles(
      categorias,
      categoriaEdicion.idCategoriaPublicacion,
    );
    if (!ordenesDisponibles.includes(Number(categoriaEdicion.ordenVisualizacion))) {
      establecerEstado((actual) => ({
        ...actual,
        error: `El orden ${categoriaEdicion.ordenVisualizacion} ya está asignado. Elige un número disponible.`,
        mensaje: "",
      }));
      return;
    }
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const datosCategoria = {
      nombre: categoriaEdicion.nombre,
      descripcion: categoriaEdicion.descripcion,
      ordenVisualizacion: Number(categoriaEdicion.ordenVisualizacion),
      activa: true,
      version: categoriaEdicion.version,
    };
    try {
      if (categoriaEdicion.idCategoriaPublicacion) {
        await actualizarCategoria(categoriaEdicion.idCategoriaPublicacion, datosCategoria);
      } else {
        await crearCategoria(datosCategoria);
      }
      const catalogo = await listarCategoriasAdministradas();
      establecerCategorias(catalogo);
      establecerCategoriaEdicion(categoriaInicial);
      establecerMostrarFormularioCategoria(false);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Categoría guardada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function nuevaPublicacion() {
    const primeraCategoria = categorias.find((categoria) => categoria.activa);
    if (!primeraCategoria) {
      establecerEstado((actual) => ({
        ...actual,
        error: "Primero debes crear al menos una categoría activa para crear noticias.",
        mensaje: "",
      }));
      return;
    }
    cancelarCategoria();
    establecerMostrarListadoPublicaciones(false);
    establecerPublicacionEdicion({
      ...publicacionInicial,
      idCategoriaPublicacion: primeraCategoria.idCategoriaPublicacion,
    });
    establecerImagenes([]);
    establecerClaveCreacion(window.crypto.randomUUID());
  }

  function cancelarPublicacion() {
    establecerPublicacionEdicion(null);
    establecerImagenes([]);
    establecerVistaPreviaImagen(null);
  }

  function alternarFormularioPublicacion() {
    if (publicacionEdicion && !publicacionEdicion.idPublicacion) return;
    nuevaPublicacion();
  }

  function alternarListadoPublicaciones() {
    if (mostrarListadoPublicaciones) return;
    cancelarCategoria();
    cancelarPublicacion();
    establecerMostrarListadoPublicaciones(true);
  }

  async function editarPublicacion(publicacion) {
    cancelarCategoria();
    establecerMostrarListadoPublicaciones(true);
    establecerPublicacionEdicion({
      ...publicacion,
      fechaEditorial: publicacion.fechaEditorial || "",
    });
    try {
      establecerImagenes(await listarImagenesPublicacion(publicacion.idPublicacion));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, error: error.message, mensaje: "" }));
    }
  }

  async function guardarPublicacion(evento) {
    evento.preventDefault();
    if (!publicacionEdicion.idPublicacion && !categorias.some((categoria) => categoria.activa)) {
      establecerEstado((actual) => ({
        ...actual,
        error: "Primero debes crear al menos una categoría activa para crear noticias.",
        mensaje: "",
      }));
      return;
    }
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    const datos = {
      ...publicacionEdicion,
      idCategoriaPublicacion: Number(publicacionEdicion.idCategoriaPublicacion),
      fechaEditorial: publicacionEdicion.fechaEditorial || null,
    };
    try {
      const guardada = publicacionEdicion.idPublicacion
        ? await actualizarPublicacion(publicacionEdicion.idPublicacion, datos)
        : await crearPublicacion(datos, claveCreacion);
      establecerPublicacionEdicion({ ...guardada, fechaEditorial: guardada.fechaEditorial || "" });
      establecerImagenes(await listarImagenesPublicacion(guardada.idPublicacion));
      await recargarPublicaciones(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Noticia guardada como borrador." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function ejecutarCambioEstado(accion) {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizada = await accion(publicacionEdicion.idPublicacion, publicacionEdicion.version);
      establecerPublicacionEdicion({ ...actualizada, fechaEditorial: actualizada.fechaEditorial || "" });
      await recargarPublicaciones(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Estado de la noticia actualizado." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function eliminarPublicacionSeleccionada() {
    const confirmada = window.confirm("¿Eliminar esta noticia definitivamente? Esta acción no se puede deshacer.");
    if (!confirmada) return;

    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await eliminarPublicacion(publicacionEdicion.idPublicacion, publicacionEdicion.version);
      cancelarPublicacion();
      await recargarPublicaciones(pagina.pagina);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Noticia eliminada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function eliminarCategoriaSeleccionada() {
    const confirmada = window.confirm(
      `¿Eliminar la categoría "${categoriaEdicion.nombre}" definitivamente? Esta acción no se puede deshacer.`,
    );
    if (!confirmada) return;

    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await eliminarCategoria(
        categoriaEdicion.idCategoriaPublicacion,
        categoriaEdicion.version,
      );
      const catalogo = await listarCategoriasAdministradas();
      establecerCategorias(catalogo);
      cancelarCategoria();
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Categoría eliminada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function subirImagen(evento) {
    evento.preventDefault();
    const formularioElemento = evento.currentTarget;
    const formulario = new window.FormData(formularioElemento);
    const archivo = formulario.get("archivo");
    const textoAlternativo = formulario.get("textoAlternativo");
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await agregarImagenPublicacion(publicacionEdicion.idPublicacion, archivo, textoAlternativo);
      establecerImagenes(await listarImagenesPublicacion(publicacionEdicion.idPublicacion));
      formularioElemento.reset();
      establecerVistaPreviaImagen(null);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen agregada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function previsualizarImagen(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) {
      establecerVistaPreviaImagen(null);
      return;
    }
    const lector = new window.FileReader();
    lector.addEventListener("load", () => {
      establecerVistaPreviaImagen({ nombre: archivo.name, url: String(lector.result) });
    });
    lector.readAsDataURL(archivo);
  }

  async function eliminarImagen(idImagen) {
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await eliminarImagenPublicacion(publicacionEdicion.idPublicacion, idImagen);
      establecerImagenes((actuales) => actuales.filter((imagen) => imagen.idImagenPublicacion !== idImagen));
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen eliminada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  const categoriasActivas = categorias.filter((categoria) => categoria.activa);
  const nuevaPublicacionNoDisponible = estado.cargando || categoriasActivas.length === 0;
  const ordenesCategoriaDisponibles = obtenerOrdenesDisponibles(
    categorias,
    categoriaEdicion.idCategoriaPublicacion,
  );
  const ordenCategoriaDisponible = ordenesCategoriaDisponibles.includes(
    Number(categoriaEdicion.ordenVisualizacion),
  );
  const publicacionExistenteSeleccionada = Boolean(
    mostrarListadoPublicaciones && publicacionEdicion?.idPublicacion,
  );

  return (
    <main className="pagina-administracion pagina-administracion-publicaciones">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Noticias</h1>
      <p>Gestiona categorías, borradores y noticias visibles en el portal público.</p>

      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Noticias</summary>
      <div className="acciones-superiores-administracion">
        {puedeCrear && <button className={mostrarFormularioCategoria ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarFormularioCategoria} onClick={alternarFormularioCategoria}>Nueva categoría</button>}
        {puedeCrear && <button className={publicacionEdicion && !publicacionEdicion.idPublicacion ? "boton-gestion-activo" : ""} type="button" aria-expanded={Boolean(publicacionEdicion && !publicacionEdicion.idPublicacion)} aria-describedby={categoriasActivas.length === 0 ? "aviso-sin-categorias-publicacion" : undefined} disabled={nuevaPublicacionNoDisponible} onClick={alternarFormularioPublicacion}>Nueva noticia</button>}
        <button className={mostrarListadoPublicaciones ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarListadoPublicaciones} onClick={alternarListadoPublicaciones}>Listado de noticias</button>
      </div>
          </details>
        </aside>
        <div className="contenido-modulo-administracion">
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
      {!estado.cargando && categoriasActivas.length === 0 && (
        <p id="aviso-sin-categorias-publicacion" className="nota-formulario-administracion" role="status">
          Primero crea al menos una categoría activa para poder crear noticias.
        </p>
      )}

      {mostrarFormularioCategoria && <section className="panel-edicion panel-categorias-publicaciones" aria-labelledby="titulo-categorias">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-categorias">Categorías</h2>
          </div>
        </div>
        <div className={`rejilla-categorias-administracion${mostrarFormularioCategoria ? "" : " solo-listado"}`}>
          <div>
            <div className="cabecera-listado-administracion cabecera-listado-categorias" aria-hidden="true">
              <span>Orden</span><span>Nombre</span>
            </div>
            <div className="lista-categorias-administracion lista-tabular-administracion lista-tabular-categorias">
            {categorias.map((categoria) => (
              <button
                type="button"
                className={categoriaEdicion.idCategoriaPublicacion === categoria.idCategoriaPublicacion ? "seleccionado" : ""}
                key={categoria.idCategoriaPublicacion}
                aria-expanded={categoriaEdicion.idCategoriaPublicacion === categoria.idCategoriaPublicacion}
                onClick={() => editarCategoria(categoria)}
              >
                <span>{categoria.ordenVisualizacion}</span>
                <strong>{categoria.nombre}</strong>
              </button>
            ))}
            {categorias.length === 0 && <p>No hay categorías registradas.</p>}
            </div>
          </div>
          {mostrarFormularioCategoria && (puedeCrear || puedeActualizar) && (
            <form className="formulario-administracion formulario-categoria-publicacion" onSubmit={guardarCategoria}>
              <label htmlFor="nombreCategoria">Nombre</label>
              <input id="nombreCategoria" required maxLength="100" value={categoriaEdicion.nombre} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, nombre: evento.target.value })} />
              <label htmlFor="descripcionCategoria">Descripción</label>
              <textarea id="descripcionCategoria" maxLength="300" value={categoriaEdicion.descripcion || ""} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, descripcion: evento.target.value })} />
              <label htmlFor="ordenCategoria">Orden de categorías</label>
              <input
                id="ordenCategoria"
                type="number"
                min="1"
                max="32767"
                required
                aria-invalid={!ordenCategoriaDisponible}
                value={categoriaEdicion.ordenVisualizacion}
                onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, ordenVisualizacion: Number(evento.target.value) })}
              />
              <div className="acciones-publicacion">
                <button type="submit" disabled={estado.guardando || !ordenCategoriaDisponible || (categoriaEdicion.idCategoriaPublicacion ? !puedeActualizar : !puedeCrear)}>Guardar categoría</button>
                <button className="boton-secundario" type="button" disabled={estado.guardando} onClick={cancelarCategoria}>Cancelar</button>
                {categoriaEdicion.idCategoriaPublicacion && puedeArchivar && (
                  <button className="boton-peligro" type="button" disabled={estado.guardando} onClick={eliminarCategoriaSeleccionada}>Eliminar</button>
                )}
              </div>
            </form>
          )}
        </div>
      </section>}

      {publicacionEdicion && <section
        id={publicacionExistenteSeleccionada ? "detalle-publicacion-seleccionada" : undefined}
        className={`panel-edicion${publicacionExistenteSeleccionada ? " panel-detalle-administracion" : ""}`}
        aria-labelledby="titulo-edicion-publicacion"
      >
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-edicion-publicacion">{publicacionEdicion?.idPublicacion ? "Editar noticia" : "Nueva noticia"}</h2>
          </div>
        </div>

        {publicacionEdicion && (
          <>
            <form className="formulario-administracion formulario-publicacion" onSubmit={guardarPublicacion}>
              <label htmlFor="categoriaPublicacion">Categoría</label>
              <select id="categoriaPublicacion" required value={publicacionEdicion.idCategoriaPublicacion} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, idCategoriaPublicacion: Number(evento.target.value) })}>{categorias.filter((categoria) => categoria.activa || categoria.idCategoriaPublicacion === publicacionEdicion.idCategoriaPublicacion).map((categoria) => <option key={categoria.idCategoriaPublicacion} value={categoria.idCategoriaPublicacion}>{categoria.nombre}</option>)}</select>
              <label htmlFor="tituloPublicacion">Título</label>
              <input id="tituloPublicacion" required maxLength="180" value={publicacionEdicion.titulo} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, titulo: evento.target.value })} />
              <label htmlFor="resumenPublicacion">Resumen</label>
              <AreaTextoAutoexpandible id="resumenPublicacion" required maxLength="500" aria-describedby="ayuda-texto-noticia" value={publicacionEdicion.resumen} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, resumen: evento.target.value })} />
              <label htmlFor="contenidoPublicacion">Contenido</label>
              <AreaTextoAutoexpandible id="contenidoPublicacion" className="contenido-extenso" required maxLength="200000" aria-describedby="ayuda-texto-noticia" value={publicacionEdicion.contenido} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, contenido: evento.target.value })} />
              <p id="ayuda-texto-noticia" className="ayuda-area-texto-autoexpandible">Resumen y contenido se amplían automáticamente mientras escribes.</p>
              <label htmlFor="fechaEditorial">Fecha editorial</label>
              <input id="fechaEditorial" type="date" value={publicacionEdicion.fechaEditorial} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, fechaEditorial: evento.target.value })} />
              <div className="acciones-publicacion">
                {publicacionEdicion.estado !== "ARCHIVADA" && ((publicacionEdicion.idPublicacion && puedeActualizar) || (!publicacionEdicion.idPublicacion && puedeCrear)) && <button type="submit" disabled={estado.guardando}>Guardar</button>}
                {publicacionEdicion.idPublicacion && publicacionEdicion.estado !== "PUBLICADA" && publicacionEdicion.estado !== "ARCHIVADA" && puedeActualizar && <button type="button" onClick={() => ejecutarCambioEstado(publicarPublicacion)}>Publicar</button>}
                {publicacionEdicion.idPublicacion && publicacionEdicion.estado === "ARCHIVADA" && puedeActualizar && <button type="button" onClick={() => ejecutarCambioEstado(desarchivarPublicacion)}>Desarchivar</button>}
                {publicacionEdicion.estado === "PUBLICADA" && <Link className="enlace-principal" to={`/noticias/${publicacionEdicion.identificadorUrl}`}>Ver en el portal</Link>}
                <button className="boton-secundario" type="button" disabled={estado.guardando} onClick={cancelarPublicacion}>Cancelar</button>
                {publicacionEdicion.idPublicacion && puedeArchivar && (
                  <div className="acciones-publicacion-peligrosas">
                    {publicacionEdicion.estado !== "ARCHIVADA" && <button className="boton-peligro" type="button" onClick={() => ejecutarCambioEstado(archivarPublicacion)}>Archivar</button>}
                    <button className="boton-peligro" type="button" onClick={eliminarPublicacionSeleccionada}>Eliminar noticia</button>
                  </div>
                )}
              </div>
            </form>

            {publicacionEdicion.idPublicacion && publicacionEdicion.estado !== "ARCHIVADA" && puedeActualizar && (
              <div className="panel-imagenes-publicacion">
                <h3>Imágenes</h3>
                <form className="formulario-imagen" onSubmit={subirImagen}>
                  <label>Archivo PNG o JPEG<input name="archivo" type="file" accept="image/png,image/jpeg" required onChange={previsualizarImagen} /></label>
                  <label>Texto alternativo<input name="textoAlternativo" maxLength="255" required /></label>
                  <button type="submit" disabled={estado.guardando || imagenes.length >= 5}>Agregar imagen</button>
                  {vistaPreviaImagen && (
                    <figure className="vista-previa-carga-publicacion">
                      <img className="vista-previa-imagen" src={vistaPreviaImagen.url} alt={`Vista previa de ${vistaPreviaImagen.nombre}`} />
                      <figcaption>Vista previa · {vistaPreviaImagen.nombre}</figcaption>
                    </figure>
                  )}
                </form>
                <ul>
                  {imagenes.map((imagen) => (
                    <li key={imagen.idImagenPublicacion}>
                      <img
                        className="miniatura-imagen-publicacion"
                        src={`/api/v1/administracion/publicaciones/${publicacionEdicion.idPublicacion}/imagenes/${imagen.idImagenPublicacion}/archivo`}
                        alt={imagen.textoAlternativo}
                      />
                      <span><strong>{imagen.nombreArchivoOriginal}</strong><small>{imagen.textoAlternativo} · {imagen.anchoPixeles} × {imagen.altoPixeles}</small></span>
                      {puedeArchivar && <button type="button" onClick={() => eliminarImagen(imagen.idImagenPublicacion)}>Eliminar</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>}

      {mostrarListadoPublicaciones && <section className="panel-edicion panel-listado-administracion" aria-labelledby="titulo-listado-publicaciones">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-listado-publicaciones">Listado de noticias</h2>
            <p>{pagina.totalElementos} noticias registradas.</p>
          </div>
        </div>
        <form className="filtros-administracion" onSubmit={aplicarFiltros}>
          <label>Buscar<input value={filtros.busqueda} maxLength="100" onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="PUBLICADA">Publicada</option><option value="ARCHIVADA">Archivada</option></select></label>
          <label>Categoría<select value={filtros.idCategoria} onChange={(evento) => establecerFiltros({ ...filtros, idCategoria: evento.target.value })}><option value="">Todas</option>{categorias.map((categoria) => <option key={categoria.idCategoriaPublicacion} value={categoria.idCategoriaPublicacion}>{categoria.nombre}</option>)}</select></label>
          <label>Orden<select value={filtros.orden} onChange={(evento) => establecerFiltros({ ...filtros, orden: evento.target.value })}><option value="ACTUALIZACION">Actualización</option><option value="TITULO">Título</option><option value="FECHAEDITORIAL">Fecha editorial</option><option value="ESTADO">Estado</option></select></label>
          <button type="submit">Aplicar</button>
        </form>
        {estado.cargando ? <p role="status">Cargando noticias…</p> : (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Versión</th><th><span className="solo-lector">Acciones</span></th></tr></thead>
              <tbody>
                {pagina.contenido.map((publicacion) => (
                  <tr className={publicacionEdicion?.idPublicacion === publicacion.idPublicacion ? "fila-seleccionada" : ""} key={publicacion.idPublicacion}>
                    <td>{publicacion.titulo}</td><td>{publicacion.nombreCategoria}</td><td>{publicacion.estado}</td><td>{publicacion.version}</td>
                    <td><button
                      className="boton-tabla"
                      type="button"
                      aria-expanded={publicacionEdicion?.idPublicacion === publicacion.idPublicacion}
                      aria-controls={publicacionEdicion?.idPublicacion === publicacion.idPublicacion ? "detalle-publicacion-seleccionada" : undefined}
                      onClick={() => editarPublicacion(publicacion)}
                    >Consultar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagina.contenido.length === 0 && <p>No se encontraron noticias.</p>}
          </div>
        )}
        {pagina.totalPaginas > 1 && (
          <nav className="paginacion" aria-label="Páginas de noticias">
            <button type="button" disabled={pagina.pagina === 0} onClick={() => cambiarPagina(pagina.pagina - 1)}>Anterior</button>
            <span>Página {pagina.pagina + 1} de {pagina.totalPaginas}</span>
            <button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cambiarPagina(pagina.pagina + 1)}>Siguiente</button>
          </nav>
        )}
      </section>}

        </div>
      </div>
    </main>
  );
}
