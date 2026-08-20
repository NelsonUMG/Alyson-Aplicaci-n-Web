import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarRolesUsuario,
  crearEmpleado,
  crearRol,
  listarPermisos,
  listarRoles,
  listarUsuarios,
} from "../api/administracionUsuarios";
import { MODULO_BICICLETAS_VISIBLE } from "../configuracion/modulos";
import { formatearPermiso, formatearTextoTecnico } from "../utilidades/formatoTexto";

const datosEmpleadoIniciales = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasenaInicial: "",
  confirmarContrasena: "",
  codigosRoles: [],
};

const datosRolIniciales = {
  nombre: "",
  descripcion: "",
  codigosPermisos: [],
};

export function PaginaAdministracionUsuarios() {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState({ contenido: [], pagina: 0, totalPaginas: 0 });
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [panelActivo, setPanelActivo] = useState("");
  const [datosEmpleado, setDatosEmpleado] = useState(datosEmpleadoIniciales);
  const [datosRol, setDatosRol] = useState(datosRolIniciales);
  const [estado, setEstado] = useState({ cargando: true, guardando: false, error: "", mensaje: "" });

  useEffect(() => {
    let vigente = true;
    Promise.all([listarRoles(), listarPermisos()])
      .then(([catalogoRoles, catalogoPermisos]) => {
        if (!vigente) return;
        setRoles(catalogoRoles);
        setPermisos(catalogoPermisos);
        setEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
      })
      .catch((error) => {
        if (vigente) setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargandoUsuarios(true);
    setEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
    const temporizador = window.setTimeout(() => {
      listarUsuarios(busqueda, 0)
        .then((usuarios) => {
          if (!vigente) return;
          setPagina(usuarios);
          setSeleccion(null);
          setCargandoUsuarios(false);
        })
        .catch((error) => {
          if (!vigente) return;
          setCargandoUsuarios(false);
          setEstado((actual) => ({ ...actual, error: error.message, mensaje: "" }));
        });
    }, busqueda ? 250 : 0);

    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [busqueda]);

  async function recargarUsuarios(texto = busqueda, numeroPagina = pagina.pagina) {
    const usuarios = await listarUsuarios(texto, numeroPagina);
    setPagina(usuarios);
  }

  async function cambiarPagina(numeroPagina) {
    setCargandoUsuarios(true);
    setEstado((actual) => ({ ...actual, cargando: true, error: "", mensaje: "" }));
    try {
      await recargarUsuarios(busqueda, numeroPagina);
      setSeleccion(null);
      setCargandoUsuarios(false);
      setEstado({ cargando: false, guardando: false, error: "", mensaje: "" });
    } catch (error) {
      setCargandoUsuarios(false);
      setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  function editar(usuario) {
    setSeleccion({ ...usuario, rolesSeleccionados: [...usuario.roles] });
    setPanelActivo("listado");
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

  function alternarRolEmpleado(codigo) {
    setDatosEmpleado((actual) => ({
      ...actual,
      codigosRoles: alternarCodigo(actual.codigosRoles, codigo),
    }));
  }

  function alternarPermiso(codigo) {
    setDatosRol((actual) => ({
      ...actual,
      codigosPermisos: alternarCodigo(actual.codigosPermisos, codigo),
    }));
  }

  function mostrarPanel(nombrePanel) {
    if (nombrePanel === "empleado" && rolesParaEmpleado.length === 0) {
      setPanelActivo("");
      setSeleccion(null);
      setEstado((actual) => ({
        ...actual,
        error: "Primero debes crear al menos un rol asignable para registrar empleados.",
        mensaje: "",
      }));
      return;
    }
    setPanelActivo(nombrePanel);
    setSeleccion(null);
    setEstado((actual) => ({ ...actual, error: "", mensaje: "" }));
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

  async function guardarEmpleado(evento) {
    evento.preventDefault();
    if (rolesParaEmpleado.length === 0 || datosEmpleado.codigosRoles.length === 0) {
      setEstado((actual) => ({
        ...actual,
        error: rolesParaEmpleado.length === 0
          ? "Primero debes crear al menos un rol asignable para registrar empleados."
          : "Selecciona al menos un rol para el empleado.",
        mensaje: "",
      }));
      return;
    }
    if (datosEmpleado.contrasenaInicial !== datosEmpleado.confirmarContrasena) {
      setEstado((actual) => ({ ...actual, error: "Las contraseñas no coinciden.", mensaje: "" }));
      return;
    }
    setEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      await crearEmpleado({
        nombre: datosEmpleado.nombre,
        apellido: datosEmpleado.apellido,
        correo: datosEmpleado.correo,
        contrasenaInicial: datosEmpleado.contrasenaInicial,
        codigosRoles: datosEmpleado.codigosRoles,
      });
      await recargarUsuarios(busqueda, 0);
      setDatosEmpleado(datosEmpleadoIniciales);
      setPanelActivo("");
      setEstado({ cargando: false, guardando: false, error: "", mensaje: "Empleado registrado." });
    } catch (error) {
      setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  async function guardarRol(evento) {
    evento.preventDefault();
    setEstado((actual) => ({ ...actual, guardando: true, error: "", mensaje: "" }));
    try {
      const rolCreado = await crearRol(datosRol);
      setRoles((actual) => [...actual, rolCreado].sort((primero, segundo) => (
        primero.nombre.localeCompare(segundo.nombre, "es")
      )));
      setDatosRol(datosRolIniciales);
      setPanelActivo("empleado");
      setEstado({ cargando: false, guardando: false, error: "", mensaje: "Rol creado. Ya puedes asignarlo a un empleado." });
    } catch (error) {
      setEstado({ cargando: false, guardando: false, error: error.message, mensaje: "" });
    }
  }

  const rolesVisiblesAdministracion = roles.filter((rol) => (
    MODULO_BICICLETAS_VISIBLE || rol.codigo !== "OPERADORBICICLETAS"
  ));
  const rolesParaEmpleado = rolesVisiblesAdministracion.filter((rol) => (
    rol.codigo !== "USUARIOREGISTRADO"
  ));
  const registroEmpleadoNoDisponible = estado.cargando || rolesParaEmpleado.length === 0;
  const gruposPermisos = agruparPermisos(permisos.filter((permiso) => (
    MODULO_BICICLETAS_VISIBLE || !permiso.codigo.startsWith("BICICLETA")
  )));

  return (
    <main className="pagina-administracion pagina-administracion-usuarios">
      <Link className="enlace-regreso" to="/perfil">← Volver al perfil</Link>
      <p className="etiqueta-fase">Administración</p>
      <h1>Usuarios y roles</h1>
      <div className="disposicion-modulo-administracion">
        <aside className="menu-lateral-administracion">
          <details open>
            <summary>Usuarios y roles</summary>
      <div className="acciones-gestion-usuarios" aria-label="Administración de empleados y roles">
        <button
          className={panelActivo === "rol" ? "boton-gestion-activo" : "boton-secundario"}
          type="button"
          aria-expanded={panelActivo === "rol"}
          onClick={() => mostrarPanel("rol")}
        >
          Crear Roles
        </button>
        <button
          className={panelActivo === "empleado" ? "boton-gestion-activo" : "boton-secundario"}
          type="button"
          aria-expanded={panelActivo === "empleado"}
          aria-describedby={rolesParaEmpleado.length === 0 ? "aviso-sin-roles-empleado" : undefined}
          disabled={registroEmpleadoNoDisponible}
          onClick={() => mostrarPanel("empleado")}
        >
          Registrar empleado
        </button>
        <button
          className={panelActivo === "listado" ? "boton-gestion-activo" : "boton-secundario"}
          type="button"
          aria-expanded={panelActivo === "listado"}
          onClick={() => mostrarPanel("listado")}
        >
          Listado de usuarios
        </button>
      </div>
          </details>
        </aside>
        <div className="contenido-modulo-administracion">
      {!estado.cargando && rolesParaEmpleado.length === 0 && (
        <p id="aviso-sin-roles-empleado" className="nota-formulario-administracion" role="status">
          Primero crea al menos un rol asignable con el botón Crear Roles para poder registrar empleados.
        </p>
      )}
      {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
      {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
      {panelActivo === "empleado" && (
        <section className="panel-edicion panel-formulario-administracion" aria-labelledby="titulo-empleado">
          <h2 id="titulo-empleado">Registrar empleado</h2>
          <p className="nota-formulario-administracion">Los clientes conservan el registro de cuenta habitual y el rol Usuario registrado.</p>
          <form className="formulario-administracion-usuarios" onSubmit={guardarEmpleado}>
            <div className="campos-formulario-administracion">
              <div>
                <label htmlFor="nombreEmpleado">Nombre</label>
                <input id="nombreEmpleado" required maxLength="80" value={datosEmpleado.nombre} onChange={(evento) => setDatosEmpleado((actual) => ({ ...actual, nombre: evento.target.value }))} />
              </div>
              <div>
                <label htmlFor="apellidoEmpleado">Apellido</label>
                <input id="apellidoEmpleado" required maxLength="80" value={datosEmpleado.apellido} onChange={(evento) => setDatosEmpleado((actual) => ({ ...actual, apellido: evento.target.value }))} />
              </div>
            </div>
            <label htmlFor="correoEmpleado">Correo electrónico</label>
            <input id="correoEmpleado" type="email" autoComplete="email" required maxLength="254" value={datosEmpleado.correo} onChange={(evento) => setDatosEmpleado((actual) => ({ ...actual, correo: evento.target.value }))} />
            <div className="campos-formulario-administracion">
              <div>
                <label htmlFor="contrasenaEmpleado">Contraseña inicial</label>
                <input id="contrasenaEmpleado" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datosEmpleado.contrasenaInicial} onChange={(evento) => setDatosEmpleado((actual) => ({ ...actual, contrasenaInicial: evento.target.value }))} />
              </div>
              <div>
                <label htmlFor="confirmarContrasenaEmpleado">Confirmar contraseña</label>
                <input id="confirmarContrasenaEmpleado" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datosEmpleado.confirmarContrasena} onChange={(evento) => setDatosEmpleado((actual) => ({ ...actual, confirmarContrasena: evento.target.value }))} />
              </div>
            </div>
            <fieldset className="selector-administracion">
              <legend>Roles del empleado</legend>
              <p>El rol Usuario registrado se asigna automáticamente.</p>
              <div className="lista-seleccion-administracion">
                {rolesParaEmpleado.map((rol) => (
                  <label key={rol.codigo}>
                    <input type="checkbox" checked={datosEmpleado.codigosRoles.includes(rol.codigo)} onChange={() => alternarRolEmpleado(rol.codigo)} />
                    <span><strong>{rol.nombre}</strong><small>{rol.descripcion}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" disabled={estado.guardando || datosEmpleado.codigosRoles.length === 0}>{estado.guardando ? "Guardando…" : "Registrar empleado"}</button>
          </form>
        </section>
      )}
      {panelActivo === "rol" && (
        <section className="panel-edicion panel-formulario-administracion" aria-labelledby="titulo-rol">
          <h2 id="titulo-rol">Crear rol para empleados</h2>
          <form className="formulario-administracion-usuarios" onSubmit={guardarRol}>
            <div className="campos-formulario-administracion">
              <div>
                <label htmlFor="nombreRol">Nombre del rol</label>
                <input id="nombreRol" required maxLength="100" value={datosRol.nombre} onChange={(evento) => setDatosRol((actual) => ({ ...actual, nombre: evento.target.value }))} />
              </div>
              <div>
                <label htmlFor="descripcionRol">Descripción</label>
                <input id="descripcionRol" maxLength="300" value={datosRol.descripcion} onChange={(evento) => setDatosRol((actual) => ({ ...actual, descripcion: evento.target.value }))} />
              </div>
            </div>
            <fieldset className="selector-administracion">
              <legend>Permisos del rol</legend>
              <div className="grupos-permisos-administracion">
                {gruposPermisos.map((grupo) => (
                  <section key={grupo.nombre} className="grupo-permisos-administracion" aria-labelledby={`grupo-${grupo.codigo}`}>
                    <h3 id={`grupo-${grupo.codigo}`}>{grupo.nombre}</h3>
                    <div className="lista-seleccion-administracion">
                      {grupo.permisos.map((permiso) => (
                        <label key={permiso.codigo}>
                          <input type="checkbox" checked={datosRol.codigosPermisos.includes(permiso.codigo)} onChange={() => alternarPermiso(permiso.codigo)} />
                          <span><strong>{formatearPermiso(permiso.codigo)}</strong><small>{permiso.descripcion}</small></span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </fieldset>
            <button type="submit" disabled={estado.guardando}>{estado.guardando ? "Guardando…" : "Crear rol"}</button>
          </form>
        </section>
      )}
      {panelActivo === "listado" && <section className="panel-edicion panel-listado-administracion" aria-labelledby="titulo-listado-usuarios">
      <h2 id="titulo-listado-usuarios">Listado de usuarios</h2>
      <div className="busqueda-usuarios">
        <label htmlFor="busqueda">Buscar por nombre o correo</label>
        <div>
          <input id="busqueda" maxLength="100" autoComplete="off" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
        </div>
      </div>
      {cargandoUsuarios ? (
        <p role="status">Cargando usuarios…</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Estado</th><th>Roles</th><th><span className="solo-lector">Acciones</span></th></tr>
            </thead>
            <tbody>
              {pagina.contenido.map((usuario) => (
                <tr className={seleccion?.idUsuario === usuario.idUsuario ? "fila-seleccionada" : ""} key={usuario.idUsuario}>
                  <td>{usuario.nombre} {usuario.apellido}</td>
                  <td>{usuario.correo}</td>
                  <td>{formatearTextoTecnico(usuario.estado)}</td>
                  <td>{usuario.roles.map(formatearTextoTecnico).join(", ")}</td>
                  <td><button
                    className="boton-tabla"
                    type="button"
                    aria-expanded={seleccion?.idUsuario === usuario.idUsuario}
                    aria-controls={seleccion?.idUsuario === usuario.idUsuario ? "detalle-usuario-seleccionado" : undefined}
                    onClick={() => editar(usuario)}
                  >Editar roles</button></td>
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
      </section>}
      {seleccion && (
        <section id="detalle-usuario-seleccionado" className="panel-edicion panel-detalle-administracion" aria-labelledby="titulo-edicion">
          <h2 id="titulo-edicion">Roles de {seleccion.nombre} {seleccion.apellido}</h2>
          <div className="lista-roles">
            {rolesVisiblesAdministracion.map((rol) => (
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
        </div>
      </div>
    </main>
  );
}

function alternarCodigo(codigos, codigo) {
  const seleccion = new Set(codigos);
  if (seleccion.has(codigo)) seleccion.delete(codigo);
  else seleccion.add(codigo);
  return [...seleccion];
}

function agruparPermisos(permisos) {
  const modulos = [
    { codigo: "AREA", nombre: "Áreas e instalaciones" },
    { codigo: "BICICLETA", nombre: "Bicicletas" },
    { codigo: "EVENTO", nombre: "Eventos e inscripciones" },
    { codigo: "INSTITUCIONAL", nombre: "Contenido institucional" },
    { codigo: "MANTENIMIENTO", nombre: "Mantenimiento" },
    { codigo: "PUBLICACION", nombre: "Publicaciones" },
    { codigo: "USUARIO", nombre: "Usuarios y roles" },
    { codigo: "ROL", nombre: "Usuarios y roles" },
    { codigo: "REPORTE", nombre: "Reportes y auditoría" },
    { codigo: "AUDITORIA", nombre: "Reportes y auditoría" },
  ];
  const grupos = new Map();

  permisos.forEach((permiso) => {
    const modulo = modulos.find((candidato) => permiso.codigo.startsWith(candidato.codigo)) || {
      codigo: "OTROS",
      nombre: "Otros permisos",
    };
    const grupo = grupos.get(modulo.nombre) || { ...modulo, permisos: [] };
    grupo.permisos.push(permiso);
    grupos.set(modulo.nombre, grupo);
  });

  return [...grupos.values()];
}
