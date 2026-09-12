import { useEffect, useState } from "react";
import {
  actualizarPortadaTramite, actualizarTramiteAdministrado, crearCategoriaTramiteAdministrada,
  crearTramiteAdministrado, listarCategoriasTramitesAdministradas, listarCatalogoTramitesAdministrado,
} from "../api/administracionSolicitudes";
import { DialogoCatalogo, IconoCatalogo, ListaEditableCatalogo } from "./ControlesCatalogoTramites";

const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const comoElementos = (lista) => lista.map((valor) => ({ id: window.crypto.randomUUID(), valor }));
const comoLista = (elementos) => elementos.map(({ valor }) => valor.trim()).filter(Boolean);
const pasos = ["Información básica", "Requisitos", "Publicación"];

function FormularioCategoria({ ocupado, guardar }) {
  const [nombre, establecerNombre] = useState("");
  return <form onSubmit={(evento) => { evento.preventDefault(); if (nombre.trim()) guardar(nombre.trim()); }}>
    <div className="dialogo-catalogo-cuerpo">
      <label className="catalogo-campo">Nombre de la categoría general
        <input autoFocus required maxLength={160} value={nombre} onChange={(evento) => establecerNombre(evento.target.value)} placeholder="Por ejemplo: Actividades deportivas" disabled={ocupado} />
      </label>
      <div className="catalogo-ejemplo-jerarquia"><IconoCatalogo nombre="carpeta" /><div><strong>{nombre.trim() || "Actividades deportivas"}</strong><span>Dentro de esta categoría podrás agregar trámites, como «Curso de natación».</span></div></div>
    </div>
    <footer className="dialogo-catalogo-pie"><span>Podrás agregar trámites después.</span><button type="submit" className="catalogo-boton-principal" disabled={ocupado || !nombre.trim()}>{ocupado ? "Creando…" : "Crear categoría"}</button></footer>
  </form>;
}

function FormularioTramite({ tramite, categorias, ocupado, guardar }) {
  const [paso, establecerPaso] = useState(0);
  const [datos, establecerDatos] = useState(tramite);
  const [requisitos, establecerRequisitos] = useState(() => comoElementos(tramite.requisitos));
  const [documentos, establecerDocumentos] = useState(() => comoElementos(tramite.documentosRequeridos));
  const [archivo, establecerArchivo] = useState(null);
  const [errorArchivo, establecerErrorArchivo] = useState("");
  const [errorFormulario, establecerErrorFormulario] = useState("");
  const campo = (nombre) => ({ name: nombre, value: datos[nombre], onChange: (evento) => { establecerDatos({ ...datos, [nombre]: evento.target.value }); establecerErrorFormulario(""); } });
  const categoria = categorias.find((item) => item.idCategoria === Number(datos.idCategoria));
  const esNuevo = tramite.idTramite === null;

  function continuar(evento) {
    evento.preventDefault();
    if (ocupado) return;
    const obligatorios = paso === 0 ? ["nombre", "resumen", "acerca"] : paso === 2 ? ["costo", "tiempoRespuesta"] : [];
    const incompleto = obligatorios.find((nombre) => !datos[nombre].trim());
    if (incompleto) {
      establecerErrorFormulario("Completa el campo indicado; no puede contener solo espacios.");
      evento.currentTarget.elements.namedItem(incompleto)?.focus();
      return;
    }
    establecerErrorFormulario("");
    if (paso < 2) { establecerPaso(paso + 1); return; }
    if (errorArchivo) return;
    guardar({
      ...datos, idCategoria: Number(datos.idCategoria), nombre: datos.nombre.trim(), resumen: datos.resumen.trim(),
      acerca: datos.acerca.trim(), requisitos: comoLista(requisitos), documentosRequeridos: comoLista(documentos),
      costo: datos.costo.trim(), tiempoRespuesta: datos.tiempoRespuesta.trim(),
    }, archivo);
  }

  function seleccionarArchivo(evento) {
    const seleccionado = evento.target.files?.[0] || null;
    if (seleccionado && (!["image/png", "image/jpeg"].includes(seleccionado.type) || seleccionado.size > 5 * 1024 * 1024)) {
      establecerErrorArchivo("Selecciona una imagen JPG o PNG de hasta 5 MB.");
      establecerArchivo(null);
      evento.target.value = "";
      return;
    }
    establecerErrorArchivo("");
    establecerArchivo(seleccionado);
  }

  return <>
    <ol className="catalogo-pasos" aria-label="Pasos del formulario">
      {pasos.map((nombre, indice) => <li key={nombre} aria-current={paso === indice ? "step" : undefined} className={indice < paso ? "paso-completo" : ""}><span>{indice < paso ? <IconoCatalogo nombre="listo" /> : indice + 1}</span>{nombre}</li>)}
    </ol>
    <form onSubmit={continuar}>
      <div className="dialogo-catalogo-cuerpo" key={paso}>
        <p className="catalogo-ayuda-paso">Paso {paso + 1} de 3 · {paso === 0 ? "Así se identificará el trámite en el catálogo." : paso === 1 ? "Agrega cada requisito o documento por separado. Puedes dejar las listas vacías si no se necesitan." : "Revisa las condiciones antes de guardar."}</p>
        {errorFormulario && <p className="catalogo-aviso catalogo-aviso-error" role="alert">{errorFormulario}</p>}
        <fieldset className="catalogo-campos" disabled={ocupado}>
          <legend className="solo-lectores-catalogo">{pasos[paso]}</legend>
          {paso === 0 && <>
            <label className="catalogo-campo">Categoría general<select autoFocus required {...campo("idCategoria")}>
              {categorias.filter((item) => item.activa || item.idCategoria === Number(datos.idCategoria)).map((item) => <option key={item.idCategoria} value={item.idCategoria}>{item.nombre}{!item.activa ? " (inactiva)" : ""}</option>)}
            </select></label>
            <label className="catalogo-campo">Nombre del trámite<input required maxLength={180} {...campo("nombre")} placeholder="Por ejemplo: Reserva de canchas" /></label>
            <label className="catalogo-campo">Descripción breve<textarea required rows={2} maxLength={500} {...campo("resumen")} placeholder="Explica en una frase qué puede solicitar la persona." /></label>
            <label className="catalogo-campo">Información del trámite<textarea required rows={4} maxLength={8000} {...campo("acerca")} placeholder="Indica a quién está dirigido y cómo se realiza." /></label>
          </>}
          {paso === 1 && <>
            <ListaEditableCatalogo titulo="Requisitos de la persona solicitante" singular="Requisito" elementos={requisitos} cambiar={establecerRequisitos} ocupado={ocupado} ayuda="Por ejemplo: Ser mayor de edad." />
            <ListaEditableCatalogo titulo="Documentos que debe presentar" singular="Documento" elementos={documentos} cambiar={establecerDocumentos} ocupado={ocupado} ayuda="Por ejemplo: Copia del DPI." />
            <label className="catalogo-opcion"><input type="checkbox" checked={datos.requiereReserva} onChange={(evento) => establecerDatos({ ...datos, requiereReserva: evento.target.checked })} /><span><strong>Solicitar instalación, fecha y horario</strong><small>Actívalo cuando el trámite incluya una reserva en el parque.</small></span></label>
          </>}
          {paso === 2 && <>
            <div className="catalogo-resumen-guardado"><span>{categoria?.nombre}</span><h3>{datos.nombre}</h3><p>{datos.resumen}</p><small>{comoLista(requisitos).length} requisitos · {comoLista(documentos).length} documentos{datos.requiereReserva ? " · Incluye reserva" : ""}</small></div>
            <div className="catalogo-dos-campos">
              <label className="catalogo-campo">Costo<input autoFocus required maxLength={180} {...campo("costo")} placeholder="Por ejemplo: Sin costo" /></label>
              <label className="catalogo-campo">Tiempo de respuesta<input required maxLength={180} {...campo("tiempoRespuesta")} placeholder="Por ejemplo: 3 días hábiles" /></label>
            </div>
            <label className="catalogo-campo">Imagen de portada <span className="catalogo-opcional">Opcional · JPG o PNG, hasta 5 MB</span><input type="file" accept="image/png,image/jpeg" onChange={seleccionarArchivo} /></label>
            {(archivo || datos.urlPortada) && <p className="catalogo-ayuda-paso">{archivo ? `Imagen seleccionada: ${archivo.name}` : "Se conservará la portada actual si no seleccionas otra."}</p>}
            {errorArchivo && <p className="catalogo-aviso catalogo-aviso-error" role="alert">{errorArchivo}</p>}
            <label className="catalogo-opcion"><input type="checkbox" checked={datos.activo} onChange={(evento) => establecerDatos({ ...datos, activo: evento.target.checked })} /><span><strong>Mostrar en el catálogo de usuarios</strong><small>{datos.activo ? "Estará disponible para iniciar solicitudes al guardar." : "Se guardará oculto. Podrás publicarlo cuando esté listo."}</small></span></label>
          </>}
        </fieldset>
      </div>
      <footer className="dialogo-catalogo-pie">
        {paso > 0 ? <button type="button" className="catalogo-boton-secundario" disabled={ocupado} onClick={() => establecerPaso(paso - 1)}><IconoCatalogo nombre="volver" />Anterior</button> : <span>Los campos de este paso son obligatorios.</span>}
        <button type="submit" className="catalogo-boton-principal" disabled={ocupado || (paso === 2 && Boolean(errorArchivo))}>{ocupado ? "Guardando…" : paso < 2 ? "Continuar" : esNuevo ? "Crear trámite" : "Guardar cambios"}{paso < 2 && <IconoCatalogo nombre="flecha" />}</button>
      </footer>
    </form>
  </>;
}

export function CatalogoTramitesAdministracion() {
  const [categorias, establecerCategorias] = useState([]);
  const [tramites, establecerTramites] = useState([]);
  const [seleccion, establecerSeleccion] = useState(null);
  const [busqueda, establecerBusqueda] = useState("");
  const [editor, establecerEditor] = useState(null);
  const [estado, establecerEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });
  const [intentoCarga, establecerIntentoCarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.all([listarCategoriasTramitesAdministradas(), listarCatalogoTramitesAdministrado()])
      .then(([listaCategorias, listaTramites]) => {
        if (!vigente) return;
        establecerCategorias(listaCategorias); establecerTramites(listaTramites);
        establecerEstado((actual) => ({ ...actual, cargando: false, error: "" }));
      }).catch((error) => { if (vigente) establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message })); });
    return () => { vigente = false; };
  }, [intentoCarga]);

  const categoriaSeleccionada = categorias.find((item) => item.idCategoria === seleccion);
  const categoriasActivas = categorias.filter((item) => item.activa);
  const consulta = normalizar(busqueda);
  const visibles = tramites.filter((item) => (seleccion === null || item.idCategoria === seleccion)
    && normalizar(`${item.nombre} ${item.resumen} ${item.categoria}`).includes(consulta));

  function abrirCategoria() {
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
    establecerEditor({ tipo: "categoria" });
  }

  function abrirTramite(tramite) {
    establecerEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
    establecerEditor({ tipo: "tramite", datos: tramite || {
      idTramite: null, idCategoria: categoriaSeleccionada?.activa ? seleccion : categoriasActivas[0]?.idCategoria,
      nombre: "", resumen: "", acerca: "", requisitos: [], documentosRequeridos: [],
      costo: "Sin costo", tiempoRespuesta: "Revisión administrativa", requiereReserva: false,
      activo: true, version: null, urlPortada: null,
    } });
  }

  async function guardarCategoria(nombre) {
    if (estado.guardando) return;
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "" }));
    try {
      const creada = await crearCategoriaTramiteAdministrada({ nombre });
      establecerCategorias((lista) => [...lista, creada].sort((a, b) => a.ordenVisualizacion - b.ordenVisualizacion));
      establecerSeleccion(creada.idCategoria); establecerBusqueda(""); establecerEditor(null);
      establecerEstado((actual) => ({ ...actual, guardando: false, mensaje: `Categoría «${creada.nombre}» creada. Ya puedes agregar su primer trámite.` }));
    } catch (error) { establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message })); }
  }

  async function guardarTramite(datos, archivo) {
    if (estado.guardando) return;
    establecerEstado((actual) => ({ ...actual, guardando: true, error: "" }));
    try {
      const { idTramite, idCategoria, nombre, resumen, acerca, requisitos, documentosRequeridos, costo, tiempoRespuesta, requiereReserva, activo, version } = datos;
      const solicitud = { idCategoria, nombre, resumen, acerca, requisitos, documentosRequeridos, costo, tiempoRespuesta, requiereReserva, activo, version };
      let guardado = idTramite === null ? await crearTramiteAdministrado(solicitud) : await actualizarTramiteAdministrado(idTramite, solicitud);
      let avisoPortada = "";
      if (archivo) {
        try { guardado = await actualizarPortadaTramite(guardado.idTramite, archivo); }
        catch { avisoPortada = " El trámite se guardó, pero la portada no se pudo cargar. Abre Editar para intentarlo de nuevo."; }
      }
      establecerTramites((lista) => idTramite === null ? [...lista, guardado] : lista.map((item) => item.idTramite === guardado.idTramite ? guardado : item));
      establecerSeleccion(guardado.idCategoria); establecerBusqueda(""); establecerEditor(null);
      establecerEstado((actual) => ({ ...actual, guardando: false, mensaje: `Trámite «${guardado.nombre}» ${idTramite === null ? "creado" : "actualizado"}.${avisoPortada}` }));
    } catch (error) { establecerEstado((actual) => ({ ...actual, guardando: false, error: error.message })); }
  }

  return <section className="catalogo-administracion" aria-label="Catálogo de trámites">
    <header className="catalogo-barra-herramientas">
      <div><h2>Catálogo de trámites</h2><p>Organiza lo que las personas pueden solicitar en el parque.</p></div>
      <button type="button" className="catalogo-boton-principal" disabled={estado.cargando || categoriasActivas.length === 0} onClick={() => abrirTramite()}><IconoCatalogo nombre="agregar" />Nuevo trámite</button>
    </header>
    {estado.mensaje && <p className="catalogo-aviso catalogo-aviso-exito" role="status"><IconoCatalogo nombre="listo" />{estado.mensaje}</p>}
    {estado.error && !editor && <div className="catalogo-aviso catalogo-aviso-error" role="alert">{estado.error}<button type="button" className="catalogo-boton-secundario" onClick={() => { establecerEstado((actual) => ({ ...actual, cargando: true, error: "" })); establecerIntentoCarga((actual) => actual + 1); }}>Reintentar</button></div>}
    {estado.cargando ? <p className="catalogo-cargando" role="status">Cargando categorías y trámites…</p> : <div className="catalogo-espacio-trabajo">
      <aside className="catalogo-categorias">
        <div className="catalogo-categorias-titulo"><h3>Categorías generales</h3><span>{categorias.length}</span></div>
        <nav aria-label="Categorías generales del catálogo">
          <button type="button" aria-pressed={seleccion === null} onClick={() => establecerSeleccion(null)}><IconoCatalogo nombre="documento" /><span>Todos los trámites</span><small>{tramites.length}</small></button>
          {categorias.map((item) => <button type="button" key={item.idCategoria} aria-pressed={seleccion === item.idCategoria} onClick={() => establecerSeleccion(item.idCategoria)}><IconoCatalogo nombre="carpeta" /><span>{item.nombre}{!item.activa && <small>Inactiva</small>}</span><small>{tramites.filter((tramite) => tramite.idCategoria === item.idCategoria).length}</small></button>)}
        </nav>
        <button type="button" className="catalogo-boton-texto catalogo-agregar-categoria" onClick={abrirCategoria}><IconoCatalogo nombre="agregar" />Nueva categoría general</button>
      </aside>
      <div className="catalogo-contenido">
        <header className="catalogo-cabecera-listado"><div><p className="catalogo-ruta">Catálogo{categoriaSeleccionada && <> / Categoría general</>}</p><h3>{categoriaSeleccionada?.nombre || "Todos los trámites"}</h3><p>{categoriaSeleccionada ? "Trámites de esta categoría" : "Consulta y edita los trámites disponibles"}</p></div>
          <label className="catalogo-buscador"><span className="solo-lectores-catalogo">Buscar trámite</span><IconoCatalogo nombre="buscar" /><input type="search" placeholder="Buscar trámite…" value={busqueda} onChange={(evento) => establecerBusqueda(evento.target.value)} /></label>
        </header>
        {visibles.length > 0 ? <>
          <div className="catalogo-encabezado-filas" aria-hidden="true"><span>Trámite</span><span>Acción</span></div>
          <ul className="catalogo-listado">
            {visibles.map((item) => <li key={item.idTramite}>
              <div className="catalogo-fila-identidad"><span className="catalogo-icono-tramite"><IconoCatalogo nombre="documento" /></span><div><h4>{item.nombre}</h4><p>{item.resumen}</p>{seleccion === null && <small>{item.categoria}</small>}</div></div>
              <button type="button" className="catalogo-boton-secundario" aria-label={`Editar ${item.nombre}`} onClick={() => abrirTramite(item)}><IconoCatalogo nombre="editar" />Editar</button>
            </li>)}
          </ul>
          <p className="catalogo-pie-listado">{visibles.length} {visibles.length === 1 ? "trámite" : "trámites"}{consulta ? " encontrados" : " en el catálogo"}</p>
        </> : <div className="catalogo-vacio"><IconoCatalogo nombre={consulta ? "buscar" : "carpeta"} /><h4>{consulta ? "No encontramos ese trámite" : categorias.length === 0 ? "Crea la primera categoría" : "Esta categoría aún no tiene trámites"}</h4><p>{consulta ? "Prueba con otro nombre o consulta todos los trámites." : categorias.length === 0 ? "Agrupa tus trámites por tema. Por ejemplo: Reservas de instalaciones o Actividades deportivas." : "Agrega el primer trámite e indica qué debe presentar la persona solicitante."}</p>
          {consulta ? <button type="button" className="catalogo-boton-secundario" onClick={() => { establecerBusqueda(""); establecerSeleccion(null); }}>Ver todos los trámites</button> : categorias.length === 0 ? <button type="button" className="catalogo-boton-principal" onClick={abrirCategoria}>Crear categoría general</button> : <button type="button" className="catalogo-boton-principal" disabled={!categoriaSeleccionada?.activa && categoriasActivas.length === 0} onClick={() => abrirTramite()}><IconoCatalogo nombre="agregar" />Agregar primer trámite</button>}
        </div>}
      </div>
    </div>}
    {editor && <DialogoCatalogo key={editor.tipo} compacto={editor.tipo === "categoria"} ocupado={estado.guardando} cerrar={() => { establecerEditor(null); establecerEstado((actual) => ({ ...actual, error: "" })); }} titulo={editor.tipo === "categoria" ? "Nueva categoría general" : editor.datos.idTramite === null ? "Nuevo trámite" : "Editar trámite"} descripcion={editor.tipo === "categoria" ? "Agrupa los trámites que pertenecen al mismo tema." : "Completa la información que verá la persona solicitante."}>
      {estado.error && <p className="catalogo-aviso catalogo-aviso-error" role="alert">{estado.error}</p>}
      {editor.tipo === "categoria" ? <FormularioCategoria ocupado={estado.guardando} guardar={guardarCategoria} /> : <FormularioTramite tramite={editor.datos} categorias={categorias} ocupado={estado.guardando} guardar={guardarTramite} />}
    </DialogoCatalogo>}
  </section>;
}
