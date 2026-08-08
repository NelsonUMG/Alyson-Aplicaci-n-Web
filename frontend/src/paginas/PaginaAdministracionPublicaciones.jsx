import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarCategoria,
  actualizarPublicacion,
  agregarImagenPublicacion,
  archivarPublicacion,
  crearCategoria,
  crearPublicacion,
  despublicarPublicacion,
  eliminarImagenPublicacion,
  listarCategoriasAdministradas,
  listarImagenesPublicacion,
  listarPublicacionesAdministradas,
  previsualizarPublicacion,
  publicarPublicacion,
} from "../api/administracionPublicaciones";
import { usarSesion } from "../autenticacion/ContextoSesion";

const categoriaInicial = {
  idCategoriaPublicacion: null,
  codigo: "",
  nombre: "",
  descripcion: "",
  ordenVisualizacion: 0,
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

export function PaginaAdministracionPublicaciones() {
  const { usuario } = usarSesion();
  const [categorias, establecerCategorias] = useState([]);
  const [categoriaEdicion, establecerCategoriaEdicion] = useState(categoriaInicial);
  const [pagina, establecerPagina] = useState(paginaInicial);
  const [filtros, establecerFiltros] = useState({ busqueda: "", estado: "", idCategoria: "", orden: "ACTUALIZACION" });
  const [publicacionEdicion, establecerPublicacionEdicion] = useState(null);
  const [previsualizacion, establecerPrevisualizacion] = useState(null);
  const [imagenes, establecerImagenes] = useState([]);
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
    establecerCategoriaEdicion(categoriaInicial);
  }

  async function guardarCategoria(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const guardada = categoriaEdicion.idCategoriaPublicacion
        ? await actualizarCategoria(categoriaEdicion.idCategoriaPublicacion, categoriaEdicion)
        : await crearCategoria(categoriaEdicion);
      const catalogo = await listarCategoriasAdministradas();
      establecerCategorias(catalogo);
      establecerCategoriaEdicion(guardada);
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Categoría guardada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function nuevaPublicacion() {
    const primeraCategoria = categorias.find((categoria) => categoria.activa);
    establecerPublicacionEdicion({
      ...publicacionInicial,
      idCategoriaPublicacion: primeraCategoria?.idCategoriaPublicacion || "",
    });
    establecerPrevisualizacion(null);
    establecerImagenes([]);
    establecerClaveCreacion(window.crypto.randomUUID());
  }

  async function editarPublicacion(publicacion) {
    establecerPublicacionEdicion({
      ...publicacion,
      fechaEditorial: publicacion.fechaEditorial || "",
    });
    establecerPrevisualizacion(null);
    try {
      establecerImagenes(await listarImagenesPublicacion(publicacion.idPublicacion));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, error: error.message, mensaje: "" }));
    }
  }

  async function guardarPublicacion(evento) {
    evento.preventDefault();
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
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Publicación guardada como borrador." });
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
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Estado de la publicación actualizado." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function mostrarPrevisualizacion() {
    try {
      establecerPrevisualizacion(await previsualizarPublicacion(publicacionEdicion.idPublicacion));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, error: error.message, mensaje: "" }));
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
      establecerEstado({ cargando: false, guardando: false, error: "", mensaje: "Imagen agregada." });
    } catch (error) {
      establecerEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
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

  return (
    <main className="pagina-administracion pagina-administracion-publicaciones">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Publicaciones</h1>
      <p>Gestiona categorías, borradores y noticias visibles en el portal público.</p>

      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}

      <section className="panel-edicion" aria-labelledby="titulo-categorias">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-categorias">Categorías</h2>
            <p>Ordena y habilita las categorías disponibles para las publicaciones.</p>
          </div>
          {puedeCrear && <button type="button" onClick={nuevaCategoria}>Nueva categoría</button>}
        </div>
        <div className="rejilla-categorias-administracion">
          <div className="lista-categorias-administracion">
            {categorias.map((categoria) => (
              <button
                type="button"
                className={categoriaEdicion.idCategoriaPublicacion === categoria.idCategoriaPublicacion ? "seleccionado" : ""}
                key={categoria.idCategoriaPublicacion}
                onClick={() => establecerCategoriaEdicion(categoria)}
              >
                <strong>{categoria.nombre}</strong>
                <span>{categoria.codigo} · {categoria.activa ? "Activa" : "Inactiva"}</span>
              </button>
            ))}
            {categorias.length === 0 && <p>No hay categorías registradas.</p>}
          </div>
          {(puedeCrear || puedeActualizar) && (
            <form className="formulario-administracion" onSubmit={guardarCategoria}>
              <label htmlFor="codigoCategoria">Código</label>
              <input id="codigoCategoria" required maxLength="64" value={categoriaEdicion.codigo} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, codigo: evento.target.value })} />
              <label htmlFor="nombreCategoria">Nombre</label>
              <input id="nombreCategoria" required maxLength="100" value={categoriaEdicion.nombre} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, nombre: evento.target.value })} />
              <label htmlFor="descripcionCategoria">Descripción</label>
              <textarea id="descripcionCategoria" maxLength="300" value={categoriaEdicion.descripcion || ""} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, descripcion: evento.target.value })} />
              <label htmlFor="ordenCategoria">Orden</label>
              <input id="ordenCategoria" type="number" min="0" max="32767" value={categoriaEdicion.ordenVisualizacion} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, ordenVisualizacion: Number(evento.target.value) })} />
              <label className="control-casilla">
                <input type="checkbox" checked={categoriaEdicion.activa} onChange={(evento) => establecerCategoriaEdicion({ ...categoriaEdicion, activa: evento.target.checked })} />
                Categoría activa
              </label>
              <button type="submit" disabled={estado.guardando || (categoriaEdicion.idCategoriaPublicacion ? !puedeActualizar : !puedeCrear)}>Guardar categoría</button>
            </form>
          )}
        </div>
      </section>

      <section className="panel-edicion" aria-labelledby="titulo-listado-publicaciones">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-listado-publicaciones">Listado de publicaciones</h2>
            <p>{pagina.totalElementos} publicaciones registradas.</p>
          </div>
          {puedeCrear && <button type="button" disabled={!categorias.some((categoria) => categoria.activa)} onClick={nuevaPublicacion}>Nueva publicación</button>}
        </div>
        <form className="filtros-administracion" onSubmit={aplicarFiltros}>
          <label>Buscar<input value={filtros.busqueda} maxLength="100" onChange={(evento) => establecerFiltros({ ...filtros, busqueda: evento.target.value })} /></label>
          <label>Estado<select value={filtros.estado} onChange={(evento) => establecerFiltros({ ...filtros, estado: evento.target.value })}><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="PUBLICADA">Publicada</option><option value="ARCHIVADA">Archivada</option></select></label>
          <label>Categoría<select value={filtros.idCategoria} onChange={(evento) => establecerFiltros({ ...filtros, idCategoria: evento.target.value })}><option value="">Todas</option>{categorias.map((categoria) => <option key={categoria.idCategoriaPublicacion} value={categoria.idCategoriaPublicacion}>{categoria.nombre}</option>)}</select></label>
          <label>Orden<select value={filtros.orden} onChange={(evento) => establecerFiltros({ ...filtros, orden: evento.target.value })}><option value="ACTUALIZACION">Actualización</option><option value="TITULO">Título</option><option value="FECHAEDITORIAL">Fecha editorial</option><option value="ESTADO">Estado</option></select></label>
          <button type="submit">Aplicar</button>
        </form>
        {estado.cargando ? <p role="status">Cargando publicaciones…</p> : (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Versión</th><th><span className="solo-lector">Acciones</span></th></tr></thead>
              <tbody>
                {pagina.contenido.map((publicacion) => (
                  <tr key={publicacion.idPublicacion}>
                    <td>{publicacion.titulo}</td><td>{publicacion.nombreCategoria}</td><td>{publicacion.estado}</td><td>{publicacion.version}</td>
                    <td><button className="boton-tabla" type="button" onClick={() => editarPublicacion(publicacion)}>Consultar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagina.contenido.length === 0 && <p>No se encontraron publicaciones.</p>}
          </div>
        )}
        {pagina.totalPaginas > 1 && (
          <nav className="paginacion" aria-label="Páginas de publicaciones">
            <button type="button" disabled={pagina.pagina === 0} onClick={() => cambiarPagina(pagina.pagina - 1)}>Anterior</button>
            <span>Página {pagina.pagina + 1} de {pagina.totalPaginas}</span>
            <button type="button" disabled={pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cambiarPagina(pagina.pagina + 1)}>Siguiente</button>
          </nav>
        )}
      </section>

      {publicacionEdicion && (
        <section className="panel-edicion" aria-labelledby="titulo-edicion-publicacion">
          <h2 id="titulo-edicion-publicacion">{publicacionEdicion.idPublicacion ? "Editar publicación" : "Nueva publicación"}</h2>
          <form className="formulario-administracion formulario-publicacion" onSubmit={guardarPublicacion}>
            <label htmlFor="categoriaPublicacion">Categoría</label>
            <select id="categoriaPublicacion" required value={publicacionEdicion.idCategoriaPublicacion} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, idCategoriaPublicacion: Number(evento.target.value) })}>{categorias.filter((categoria) => categoria.activa || categoria.idCategoriaPublicacion === publicacionEdicion.idCategoriaPublicacion).map((categoria) => <option key={categoria.idCategoriaPublicacion} value={categoria.idCategoriaPublicacion}>{categoria.nombre}</option>)}</select>
            <label htmlFor="tituloPublicacion">Título</label>
            <input id="tituloPublicacion" required maxLength="180" value={publicacionEdicion.titulo} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, titulo: evento.target.value })} />
            <label htmlFor="resumenPublicacion">Resumen</label>
            <textarea id="resumenPublicacion" required maxLength="500" value={publicacionEdicion.resumen} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, resumen: evento.target.value })} />
            <label htmlFor="contenidoPublicacion">Contenido</label>
            <textarea id="contenidoPublicacion" className="contenido-extenso" required maxLength="200000" value={publicacionEdicion.contenido} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, contenido: evento.target.value })} />
            <label htmlFor="fechaEditorial">Fecha editorial</label>
            <input id="fechaEditorial" type="date" value={publicacionEdicion.fechaEditorial} onChange={(evento) => establecerPublicacionEdicion({ ...publicacionEdicion, fechaEditorial: evento.target.value })} />
            <div className="acciones-publicacion">
              {publicacionEdicion.estado !== "ARCHIVADA" && ((publicacionEdicion.idPublicacion && puedeActualizar) || (!publicacionEdicion.idPublicacion && puedeCrear)) && <button type="submit" disabled={estado.guardando}>Guardar</button>}
              {publicacionEdicion.idPublicacion && <button type="button" onClick={mostrarPrevisualizacion}>Previsualizar</button>}
              {publicacionEdicion.idPublicacion && publicacionEdicion.estado !== "PUBLICADA" && publicacionEdicion.estado !== "ARCHIVADA" && puedeActualizar && <button type="button" onClick={() => ejecutarCambioEstado(publicarPublicacion)}>Publicar</button>}
              {publicacionEdicion.idPublicacion && publicacionEdicion.estado === "PUBLICADA" && puedeActualizar && <button type="button" onClick={() => ejecutarCambioEstado(despublicarPublicacion)}>Despublicar</button>}
              {publicacionEdicion.idPublicacion && publicacionEdicion.estado !== "ARCHIVADA" && puedeArchivar && <button className="boton-peligro" type="button" onClick={() => ejecutarCambioEstado(archivarPublicacion)}>Archivar</button>}
              {publicacionEdicion.estado === "PUBLICADA" && <Link className="enlace-principal" to={`/noticias/${publicacionEdicion.identificadorUrl}`}>Ver en el portal</Link>}
            </div>
          </form>

          {publicacionEdicion.idPublicacion && publicacionEdicion.estado !== "ARCHIVADA" && puedeActualizar && (
            <div className="panel-imagenes-publicacion">
              <h3>Imágenes</h3>
              <form className="formulario-imagen" onSubmit={subirImagen}>
                <label>Archivo PNG o JPEG<input name="archivo" type="file" accept="image/png,image/jpeg" required /></label>
                <label>Texto alternativo<input name="textoAlternativo" maxLength="255" required /></label>
                <button type="submit" disabled={estado.guardando || imagenes.length >= 5}>Agregar imagen</button>
              </form>
              <ul>
                {imagenes.map((imagen) => (
                  <li key={imagen.idImagenPublicacion}><span><strong>{imagen.nombreArchivoOriginal}</strong><small>{imagen.textoAlternativo} · {imagen.anchoPixeles} × {imagen.altoPixeles}</small></span>{puedeArchivar && <button type="button" onClick={() => eliminarImagen(imagen.idImagenPublicacion)}>Eliminar</button>}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {previsualizacion && (
        <section className="panel-edicion previsualizacion-publicacion" aria-labelledby="titulo-previsualizacion">
          <p className="etiqueta-fase">{previsualizacion.nombreCategoria}</p>
          <h2 id="titulo-previsualizacion">{previsualizacion.titulo}</h2>
          <p className="resumen-previsualizacion">{previsualizacion.resumen}</p>
          <p className="contenido-previsualizacion">{previsualizacion.contenido}</p>
          <button type="button" onClick={() => establecerPrevisualizacion(null)}>Cerrar previsualización</button>
        </section>
      )}
    </main>
  );
}
