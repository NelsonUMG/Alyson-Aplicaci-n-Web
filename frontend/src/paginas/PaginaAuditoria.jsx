import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarEventosAuditoria } from "../api/administracionAuditoria";

const paginaVacia = { contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 };
const filtrosVacios = {
  accion: "",
  tipoRecurso: "",
  idRecurso: "",
  resultado: "",
  idUsuarioActor: "",
  desde: "",
  hasta: "",
};

const accionesCrear = new Set([
  "ADMINISTRADORINICIALCREADO",
  "AREACREADA",
  "BICICLETACREADA",
  "CATEGORIAAREACREADA",
  "CATEGORIAPUBLICACIONCREADA",
  "CONEXIONMAPACREADA",
  "CUENTAREGISTRADA",
  "EMPLEADOCREADO",
  "EVENTOCREADO",
  "NODOMAPACREADO",
  "PUBLICACIONCREADA",
  "RESERVAAREACREADA",
  "ROLCREADO",
]);

const accionesEliminar = new Set([
  "AREAELIMINADA",
  "CONEXIONMAPAELIMINADA",
  "IMAGENAREAELIMINADA",
  "IMAGENEVENTOELIMINADA",
  "IMAGENPUBLICACIONELIMINADA",
  "NODOMAPAELIMINADO",
  "PUBLICACIONELIMINADA",
]);

const etiquetasAccionesEspeciales = {
  CIERRESESION: "Cerrar sesión",
  INICIOSESION: "Iniciar sesión",
};

const etiquetasModulos = {
  AREA: "Áreas",
  BICICLETA: "Bicicletas",
  CATEGORIAAREA: "Áreas",
  CATEGORIAPUBLICACION: "Publicaciones",
  CONEXIONMAPA: "Mapa",
  EVENTO: "Eventos",
  INSCRIPCIONEVENTO: "Eventos",
  NODOMAPA: "Mapa",
  PUBLICACION: "Publicaciones",
  RESERVAAREA: "Áreas",
  ROL: "Usuarios y roles",
  SESION: "Sesión",
  USUARIO: "Usuarios y roles",
};

const etiquetasResultados = {
  DENEGADO: "Denegado",
  EXITOSO: "Exitoso",
  FALLIDO: "Fallido",
};

function etiquetaLegible(codigo, etiquetas) {
  if (!codigo) return "";
  const clave = codigo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "").toUpperCase();
  return etiquetas[clave] ?? codigo.charAt(0).toUpperCase() + codigo.slice(1).toLowerCase();
}

function etiquetaAccion(codigo) {
  const clave = codigo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "").toUpperCase();
  if (accionesCrear.has(clave)) return "Crear";
  if (accionesEliminar.has(clave)) return "Eliminar";
  return etiquetasAccionesEspeciales[clave] ?? "Modificar";
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(fecha));
}

export function PaginaAuditoria() {
  const [pagina, establecerPagina] = useState(paginaVacia);
  const [filtros, establecerFiltros] = useState(filtrosVacios);
  const [filtrosAplicados, establecerFiltrosAplicados] = useState(filtrosVacios);
  const [estado, establecerEstado] = useState({ cargando: true, error: "" });
  const [mostrarListado, establecerMostrarListado] = useState(false);

  async function cargar(parametros, numeroPagina = 0) {
    establecerEstado({ cargando: true, error: "" });
    try {
      const respuesta = await listarEventosAuditoria({ ...parametros, pagina: numeroPagina });
      establecerPagina(respuesta);
      establecerEstado({ cargando: false, error: "" });
    } catch (error) {
      establecerEstado({ cargando: false, error: error.message });
    }
  }

  useEffect(() => {
    let vigente = true;
    listarEventosAuditoria()
      .then((respuesta) => {
        if (vigente) {
          establecerPagina(respuesta);
          establecerEstado({ cargando: false, error: "" });
        }
      })
      .catch((error) => {
        if (vigente) establecerEstado({ cargando: false, error: error.message });
      });
    return () => {
      vigente = false;
    };
  }, []);

  function aplicarFiltros(evento) {
    evento.preventDefault();
    establecerFiltrosAplicados({ ...filtros });
    cargar(filtros, 0);
  }

  return (
    <main className="pagina-administracion pagina-auditoria">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Consulta autorizada</p>
      <h1>Auditoría del sistema</h1>
      <p>Consulta operaciones sensibles registradas por el servidor. Los eventos son de solo lectura.</p>
      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Auditoría del sistema</summary>
      <div className="acciones-superiores-administracion">
        <button className={mostrarListado ? "boton-gestion-activo" : ""} type="button" aria-expanded={mostrarListado} onClick={() => establecerMostrarListado(true)}>
          Listado de auditoría
        </button>
      </div>
          </details>
        </aside>
        <div className="contenido-modulo-administracion">
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}

      {mostrarListado && <section className="panel-edicion" aria-labelledby="titulo-eventos-auditoria">
        <div className="cabecera-panel-administracion">
          <div>
            <h2 id="titulo-eventos-auditoria">Eventos registrados</h2>
            <p>{pagina.totalElementos} eventos encontrados.</p>
          </div>
        </div>
        <form className="filtros-administracion filtros-auditoria" onSubmit={aplicarFiltros}>
          <label>Acción<input maxLength="80" value={filtros.accion} onChange={(evento) => establecerFiltros({ ...filtros, accion: evento.target.value })} /></label>
          <label>Módulo<input maxLength="80" value={filtros.tipoRecurso} onChange={(evento) => establecerFiltros({ ...filtros, tipoRecurso: evento.target.value })} /></label>
          <label>Resultado<select value={filtros.resultado} onChange={(evento) => establecerFiltros({ ...filtros, resultado: evento.target.value })}><option value="">Todos</option><option value="EXITOSO">Exitoso</option><option value="DENEGADO">Denegado</option><option value="FALLIDO">Fallido</option></select></label>
          <label>Id del actor<input type="number" min="1" value={filtros.idUsuarioActor} onChange={(evento) => establecerFiltros({ ...filtros, idUsuarioActor: evento.target.value })} /></label>
          <label>Desde<input type="datetime-local" value={filtros.desde} onChange={(evento) => establecerFiltros({ ...filtros, desde: evento.target.value })} /></label>
          <label>Hasta<input type="datetime-local" value={filtros.hasta} onChange={(evento) => establecerFiltros({ ...filtros, hasta: evento.target.value })} /></label>
          <button type="submit" disabled={estado.cargando}>Aplicar</button>
        </form>

        <div className="tabla-contenedor tabla-auditoria">
          <table>
            <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Módulo</th><th>Resultado</th></tr></thead>
            <tbody>
              {pagina.contenido.map((evento) => (
                <tr key={evento.idEventoAuditoria}>
                  <td>{formatearFecha(evento.ocurridoEn)}</td>
                  <td>{evento.nombreActor}{evento.idUsuarioActor ? <small>Id {evento.idUsuarioActor}</small> : null}</td>
                  <td>{etiquetaAccion(evento.codigoAccion)}</td>
                  <td>{etiquetaLegible(evento.tipoRecurso, etiquetasModulos)}{evento.idRecurso ? <small>Registro {evento.idRecurso}</small> : null}</td>
                  <td><span className="etiqueta-estado">{etiquetaLegible(evento.resultado, etiquetasResultados)}</span></td>
                </tr>
              ))}
              {!estado.cargando && pagina.contenido.length === 0 && <tr><td colSpan="5">No hay eventos que coincidan con la consulta.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="acciones-paginacion">
          <button type="button" disabled={estado.cargando || pagina.pagina <= 0} onClick={() => cargar(filtrosAplicados, pagina.pagina - 1)}>Anterior</button>
          <span>Página {pagina.totalPaginas === 0 ? 0 : pagina.pagina + 1} de {pagina.totalPaginas}</span>
          <button type="button" disabled={estado.cargando || pagina.pagina + 1 >= pagina.totalPaginas} onClick={() => cargar(filtrosAplicados, pagina.pagina + 1)}>Siguiente</button>
        </div>
      </section>}
        </div>
      </div>
    </main>
  );
}
