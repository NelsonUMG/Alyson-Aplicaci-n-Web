import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarRolesUsuario,
  listarRoles,
  listarUsuarios,
} from "../api/administracionUsuarios";

export function PaginaAdministracionUsuarios() {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState({ contenido: [], pagina: 0, totalPaginas: 0 });
  const [roles, setRoles] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [estado, setEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  useEffect(() => {
    let vigente = true;
    Promise.all([listarUsuarios(), listarRoles()])
      .then(([usuarios, catalogoRoles]) => {
        if (!vigente) return;
        setPagina(usuarios);
        setRoles(catalogoRoles);
        setEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
      })
      .catch((error) => {
        if (vigente) setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function buscar(evento) {
    evento.preventDefault();
    setEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      setPagina(await listarUsuarios(busqueda));
      setSeleccion(null);
      setEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function cambiarPagina(numeroPagina) {
    setEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      setPagina(await listarUsuarios(busqueda, numeroPagina));
      setSeleccion(null);
      setEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function editar(usuario) {
    setSeleccion({ ...usuario, rolesSeleccionados: [...usuario.roles] });
    setEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
  }

  function alternarRol(codigo) {
    setSeleccion((actual) => {
      const codigos = new Set(actual.rolesSeleccionados);
      if (codigos.has(codigo)) codigos.delete(codigo);
      else codigos.add(codigo);
      return { ...actual, rolesSeleccionados: [...codigos] };
    });
  }

  async function guardarRoles() {
    setEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const actualizado = await actualizarRolesUsuario(
        seleccion.idUsuario,
        seleccion.rolesSeleccionados,
        seleccion.version,
      );
      setPagina((actual) => ({
        ...actual,
        contenido: actual.contenido.map((usuario) => (
          usuario.idUsuario === actualizado.idUsuario ? actualizado : usuario
        )),
      }));
      setSeleccion({ ...actualizado, rolesSeleccionados: [...actualizado.roles] });
      setEstado({ cargando: false, guardando: false, error: "", mensaje: "Roles actualizados." });
    } catch (error) {
      setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  return (
    <main className="pagina-administracion">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración autorizada</p>
      <h1>Usuarios y roles</h1>
      <form className="busqueda-usuarios" onSubmit={buscar}>
        <label htmlFor="busqueda">Buscar por nombre o correo</label>
        <div>
          <input id="busqueda" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
          <button type="submit">Buscar</button>
        </div>
      </form>
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
      {estado.cargando ? (
        <p role="status">Cargando usuarios…</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Estado</th><th>Roles</th><th><span className="solo-lector">Acciones</span></th></tr>
            </thead>
            <tbody>
              {pagina.contenido.map((usuario) => (
                <tr key={usuario.idUsuario}>
                  <td>{usuario.nombre} {usuario.apellido}</td>
                  <td>{usuario.correo}</td>
                  <td>{usuario.estado}</td>
                  <td>{usuario.roles.join(", ")}</td>
                  <td><button className="boton-tabla" type="button" onClick={() => editar(usuario)}>Editar roles</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagina.contenido.length === 0 && <p>No se encontraron usuarios.</p>}
          {pagina.totalPaginas > 1 && (
            <nav className="paginacion" aria-label="Páginas de usuarios">
              <button
                type="button"
                disabled={pagina.pagina === 0}
                onClick={() => cambiarPagina(pagina.pagina - 1)}
              >
                Anterior
              </button>
              <span>Página {pagina.pagina + 1} de {pagina.totalPaginas}</span>
              <button
                type="button"
                disabled={pagina.pagina + 1 >= pagina.totalPaginas}
                onClick={() => cambiarPagina(pagina.pagina + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </div>
      )}
      {seleccion && (
        <section className="panel-edicion" aria-labelledby="titulo-edicion">
          <h2 id="titulo-edicion">Roles de {seleccion.nombre} {seleccion.apellido}</h2>
          <div className="lista-roles">
            {roles.map((rol) => (
              <label key={rol.codigo}>
                <input
                  type="checkbox"
                  checked={seleccion.rolesSeleccionados.includes(rol.codigo)}
                  onChange={() => alternarRol(rol.codigo)}
                />
                <span><strong>{rol.nombre}</strong><small>{rol.descripcion}</small></span>
              </label>
            ))}
          </div>
          <button type="button" disabled={estado.guardando} onClick={guardarRoles}>
            {estado.guardando ? "Guardando…" : "Guardar roles"}
          </button>
        </section>
      )}
    </main>
  );
}
