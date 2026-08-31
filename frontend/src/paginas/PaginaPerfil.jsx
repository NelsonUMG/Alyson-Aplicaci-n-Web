import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  actualizarPerfil,
  cambiarContrasena,
  eliminarFotoPerfil,
  obtenerPerfil,
  subirFotoPerfil,
} from "../api/autenticacion";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { esUsuarioComun } from "../autenticacion/clasificacionUsuario";
import { MODULO_BICICLETAS_VISIBLE } from "../configuracion/modulos";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

export function PaginaPerfil() {
  const { usuario, cerrar, actualizarUsuario } = usarSesion();
  const navegacion = useNavigate();
  const [datos, setDatos] = useState({ contrasenaActual: "", contrasenaNueva: "" });
  const [estado, setEstado] = useState({ enviando: false, error: "", mensaje: "" });
  const esAdministrador = usuario.roles.includes("ADMINISTRADOR");
  const usuarioComun = esUsuarioComun(usuario);
  const rolesVisibles = usuario.roles.filter((rol) => rol !== "USUARIOREGISTRADO");
  const modulosAdministracion = usuarioComun ? [] : [
    {
      permiso: "ROLGESTIONAR",
      destino: "/administracion/usuarios",
      etiqueta: "Usuarios y roles",
      icono: "usuarios",
    },
    {
      permiso: "PUBLICACIONLEER",
      destino: "/administracion/publicaciones",
      etiqueta: "Noticias",
      icono: "publicaciones",
    },
    {
      permiso: "EVENTOLEER",
      destino: "/administracion/eventos",
      etiqueta: "Eventos y cursos",
      icono: "eventos",
    },
    {
      permiso: "AREALEER",
      destino: "/administracion/areas",
      etiqueta: "Áreas, instalaciones y mapa",
      icono: "areas",
    },
    {
      permiso: "BICICLETALEER",
      destino: "/administracion/bicicletas",
      etiqueta: "Inventario de bicicletas",
      icono: "bicicletas",
      visible: MODULO_BICICLETAS_VISIBLE,
    },
    {
      permiso: "INSTITUCIONALGESTIONAR",
      destino: "/administracion/institucional",
      etiqueta: "Contenido institucional",
      icono: "institucional",
    },
    {
      permiso: "SOLICITUDGESTIONAR",
      destino: "/administracion/solicitudes",
      etiqueta: "Solicitudes de instalaciones",
      icono: "solicitudes",
    },
    {
      permiso: "REPORTELEER",
      destino: "/administracion/reportes/inscripciones",
      etiqueta: "Reportes de inscripciones",
      icono: "reportes",
    },
    {
      permiso: "REPORTELEER",
      destino: "/administracion/auditoria",
      etiqueta: "Auditoría del sistema",
      icono: "auditoria",
    },
  ].filter((modulo) => modulo.visible !== false && usuario.permisos.includes(modulo.permiso));

  async function salir() {
    await cerrar();
    navegacion("/", { replace: true });
  }

  async function enviarCambio(evento) {
    evento.preventDefault();
    setEstado({ enviando: true, error: "", mensaje: "" });
    try {
      await cambiarContrasena(datos);
      setDatos({ contrasenaActual: "", contrasenaNueva: "" });
      setEstado({ enviando: false, error: "", mensaje: "La contraseña fue actualizada." });
    } catch (error) {
      setEstado({ enviando: false, error: error.message, mensaje: "" });
    }
  }

  if (usuarioComun) {
    return (
      <PerfilUsuarioComun
        usuario={usuario}
        actualizarUsuario={actualizarUsuario}
        salir={salir}
        datosContrasena={datos}
        establecerDatosContrasena={setDatos}
        estadoContrasena={estado}
        enviarCambio={enviarCambio}
      />
    );
  }

  return (
    <main className="pagina-cuenta">
      <Link className="enlace-regreso" to="/">← Volver al inicio</Link>
      <header className="cabecera-cuenta">
        <div>
          <p className="etiqueta-fase">Sesión activa</p>
          <h1>{esAdministrador ? usuario.nombre : `${usuario.nombre} ${usuario.apellido}`}</h1>
          <p>{usuario.correo}</p>
        </div>
        <button className="boton-secundario" type="button" onClick={salir}>Cerrar sesión</button>
      </header>
      {!esAdministrador && !usuarioComun && (
        <section className="panel-cuenta" aria-labelledby="titulo-roles">
          <h2 id="titulo-roles">Roles asignados</h2>
          <ul className="lista-etiquetas">
            {rolesVisibles.map((rol) => <li key={rol}>{formatearTextoTecnico(rol)}</li>)}
          </ul>
        </section>
      )}
      {modulosAdministracion.length > 0 && (
        <section className="panel-cuenta panel-modulos" aria-labelledby="titulo-modulos">
          <h2 id="titulo-modulos">Visualización de módulos</h2>
          <nav className="modulos-administracion" aria-label="Accesos de administración">
            {modulosAdministracion.map((modulo) => (
              <Link key={modulo.destino} className="tarjeta-modulo" to={modulo.destino}>
                <span className="icono-modulo" aria-hidden="true"><IconoModulo tipo={modulo.icono} /></span>
                <span>{modulo.etiqueta}</span>
              </Link>
            ))}
          </nav>
        </section>
      )}
      {!esAdministrador && (
        <section className="panel-cuenta" aria-labelledby="titulo-contrasena">
          <h2 id="titulo-contrasena">Cambiar contraseña</h2>
          {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
          {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
          <form className="formulario-compacto" onSubmit={enviarCambio}>
            <label htmlFor="contrasenaActual">Contraseña actual</label>
            <input id="contrasenaActual" type="password" autoComplete="current-password" required maxLength="128" value={datos.contrasenaActual} onChange={(evento) => setDatos({ ...datos, contrasenaActual: evento.target.value })} />
            <label htmlFor="contrasenaNueva">Contraseña nueva</label>
            <input id="contrasenaNueva" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datos.contrasenaNueva} onChange={(evento) => setDatos({ ...datos, contrasenaNueva: evento.target.value })} />
            <button type="submit" disabled={estado.enviando}>Actualizar contraseña</button>
          </form>
        </section>
      )}
    </main>
  );
}

function datosPerfilDesdeUsuario(usuario) {
  return {
    nombre: usuario.nombre || "",
    apellido: usuario.apellido || "",
    fechaNacimiento: usuario.fechaNacimiento || "",
    dpi: usuario.dpi || "",
    dpiExtendidoEn: usuario.dpiExtendidoEn || "",
    celular: usuario.celular || "",
    telefono: usuario.telefono || "",
    direccion: usuario.direccion || "",
  };
}

function IconoPerfil({ tipo }) {
  const propiedades = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (tipo === "usuario") return <svg {...propiedades}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21c.7-5 3.2-7.3 7.5-7.3s6.8 2.3 7.5 7.3" /></svg>;
  if (tipo === "identificacion") return <svg {...propiedades}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5.5 16c.4-1.7 1.2-2.5 2.5-2.5s2.1.8 2.5 2.5M13 9h5M13 13h5M13 16h3" /></svg>;
  if (tipo === "contacto") return <svg {...propiedades}><path d="M5 4h3l1.5 4-2 1.5a15 15 0 0 0 7 7l1.5-2 4 1.5v3c0 1.1-.9 2-2 2C9.7 21 3 14.3 3 6c0-1.1.9-2 2-2Z" /></svg>;
  if (tipo === "camara") return <svg {...propiedades}><path d="M4 7h4l1.5-2h5L16 7h4v12H4Z" /><circle cx="12" cy="13" r="3.5" /></svg>;
  if (tipo === "candado") return <svg {...propiedades}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
  return <svg {...propiedades}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
}

function PerfilUsuarioComun({
  usuario,
  actualizarUsuario,
  salir,
  datosContrasena,
  establecerDatosContrasena,
  estadoContrasena,
  enviarCambio,
}) {
  const [perfil, establecerPerfil] = useState(() => datosPerfilDesdeUsuario(usuario));
  const [estadoPerfil, establecerEstadoPerfil] = useState({ enviando: false, error: "", mensaje: "" });
  const [versionFoto, establecerVersionFoto] = useState(() => Date.now());
  const entradaFoto = useRef(null);

  useEffect(() => {
    establecerPerfil(datosPerfilDesdeUsuario(usuario));
  }, [usuario]);

  useEffect(() => {
    let vigente = true;
    obtenerPerfil()
      .then((perfilActual) => {
        if (!vigente) return;
        actualizarUsuario(perfilActual);
      })
      .catch((error) => {
        if (vigente) establecerEstadoPerfil({ enviando: false, error: error.message, mensaje: "" });
      });
    return () => { vigente = false; };
  }, [actualizarUsuario, usuario.idUsuario]);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    establecerPerfil((actual) => ({ ...actual, [name]: value }));
  }

  async function guardarDatos(evento) {
    evento.preventDefault();
    establecerEstadoPerfil({ enviando: true, error: "", mensaje: "" });
    try {
      const perfilActualizado = await actualizarPerfil(perfil);
      actualizarUsuario(perfilActualizado);
      establecerEstadoPerfil({ enviando: false, error: "", mensaje: "Tus datos fueron actualizados correctamente." });
    } catch (error) {
      establecerEstadoPerfil({ enviando: false, error: error.message, mensaje: "" });
    }
  }

  async function seleccionarFoto(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    establecerEstadoPerfil({ enviando: true, error: "", mensaje: "" });
    try {
      const perfilActualizado = await subirFotoPerfil(archivo);
      actualizarUsuario(perfilActualizado);
      establecerVersionFoto(Date.now());
      establecerEstadoPerfil({ enviando: false, error: "", mensaje: "La fotografía del perfil fue actualizada." });
    } catch (error) {
      establecerEstadoPerfil({ enviando: false, error: error.message, mensaje: "" });
    } finally {
      evento.target.value = "";
    }
  }

  async function quitarFoto() {
    if (!window.confirm("¿Deseas eliminar la fotografía de tu perfil?")) return;
    establecerEstadoPerfil({ enviando: true, error: "", mensaje: "" });
    try {
      const perfilActualizado = await eliminarFotoPerfil();
      actualizarUsuario(perfilActualizado);
      establecerEstadoPerfil({ enviando: false, error: "", mensaje: "La fotografía fue eliminada." });
    } catch (error) {
      establecerEstadoPerfil({ enviando: false, error: error.message, mensaje: "" });
    }
  }

  const iniciales = `${usuario.nombre?.charAt(0) || ""}${usuario.apellido?.charAt(0) || ""}`.toUpperCase();
  const urlFoto = usuario.urlFotoPerfil ? `${usuario.urlFotoPerfil}?v=${versionFoto}` : "";

  return (
    <div className="aplicacion-perfil-usuario">
      <header className="cabecera-perfil-usuario">
        <div className="interior-cabecera-perfil">
          <Link className="marca-perfil-usuario" to="/">
            <span><img src="/imagenes/escudo-guatemala.png" alt="" aria-hidden="true" /></span>
            <strong>Parque Erick Barrondo<small>Portal de gestiones</small></strong>
          </Link>
          <button type="button" onClick={salir}>Cerrar sesión</button>
        </div>
      </header>

      <main className="contenido-perfil-usuario">
        <nav className="miga-perfil-usuario" aria-label="Ruta actual"><Link to="/">Inicio</Link><span>›</span><strong>Mi cuenta</strong></nav>
        <section className="encabezado-perfil-usuario">
          <div><p>Cuenta personal</p><h1>Mi cuenta</h1><span>Administra tu información personal y la seguridad de tu acceso.</span></div>
        </section>

        {estadoPerfil.error && <p className="mensaje-error aviso-perfil-usuario" role="alert">{estadoPerfil.error}</p>}
        {estadoPerfil.mensaje && <p className="mensaje-exito aviso-perfil-usuario" role="status">{estadoPerfil.mensaje}</p>}

        <form className="formulario-perfil-usuario" onSubmit={guardarDatos}>
          <div className="cuadricula-perfil-usuario">
            <aside className="tarjeta-foto-perfil">
              <p>Fotografía de perfil</p>
              <div className="foto-perfil-usuario">
                {urlFoto ? <img src={urlFoto} alt={`Fotografía de ${usuario.nombre} ${usuario.apellido}`} /> : <span>{iniciales || "U"}</span>}
              </div>
              <h2>{usuario.nombre} {usuario.apellido}</h2>
              <small>PNG o JPEG · máximo 5 MB</small>
              <input ref={entradaFoto} id="fotoPerfil" className="entrada-foto-perfil" type="file" accept="image/png,image/jpeg" onChange={seleccionarFoto} disabled={estadoPerfil.enviando} />
              <div className="acciones-foto-perfil">
                <label htmlFor="fotoPerfil"><IconoPerfil tipo="camara" /> {urlFoto ? "Cambiar foto" : "Subir foto"}</label>
                {urlFoto && <button type="button" onClick={quitarFoto} disabled={estadoPerfil.enviando}>Eliminar foto</button>}
              </div>
            </aside>

            <section className="tarjeta-datos-perfil">
              <header><span><IconoPerfil tipo="usuario" /></span><div><h2>Datos personales</h2><p>Información básica de tu cuenta.</p></div></header>
              <label htmlFor="nombrePerfil">Nombres *</label>
              <input id="nombrePerfil" name="nombre" required maxLength="80" value={perfil.nombre} onChange={actualizarCampo} />
              <label htmlFor="apellidoPerfil">Apellidos *</label>
              <input id="apellidoPerfil" name="apellido" required maxLength="80" value={perfil.apellido} onChange={actualizarCampo} />
              <label htmlFor="fechaNacimientoPerfil">Fecha de nacimiento *</label>
              <input id="fechaNacimientoPerfil" name="fechaNacimiento" type="date" required value={perfil.fechaNacimiento} onChange={actualizarCampo} />
            </section>

            <section className="tarjeta-datos-perfil">
              <header><span><IconoPerfil tipo="identificacion" /></span><div><h2>Datos de identificación</h2><p>Datos del documento personal.</p></div></header>
              <label htmlFor="dpiPerfil">DPI · CUI *</label>
              <input id="dpiPerfil" value={perfil.dpi} readOnly aria-readonly="true" />
              <label htmlFor="dpiExtendidoPerfil">Extendido en *</label>
              <input id="dpiExtendidoPerfil" name="dpiExtendidoEn" required maxLength="120" placeholder="Ej.: Guatemala, Guatemala" value={perfil.dpiExtendidoEn} onChange={actualizarCampo} />
            </section>

            <section className="tarjeta-datos-perfil">
              <header><span><IconoPerfil tipo="contacto" /></span><div><h2>Datos de contacto</h2><p>Medios para comunicarnos contigo.</p></div></header>
              <label htmlFor="correoPerfil">Correo electrónico</label>
              <input id="correoPerfil" type="email" value={usuario.correo} readOnly aria-readonly="true" />
              <label htmlFor="celularPerfil">Celular *</label>
              <input id="celularPerfil" name="celular" type="tel" inputMode="numeric" pattern="[0-9]{8}" required maxLength="8" value={perfil.celular} onChange={actualizarCampo} />
              <label htmlFor="telefonoPerfil">Teléfono <small>Opcional</small></label>
              <input id="telefonoPerfil" name="telefono" type="tel" maxLength="24" value={perfil.telefono} onChange={actualizarCampo} />
              <label htmlFor="direccionPerfil">Dirección <small>Opcional</small></label>
              <textarea id="direccionPerfil" name="direccion" rows="3" maxLength="300" value={perfil.direccion} onChange={actualizarCampo} />
            </section>
          </div>
          <button className="boton-actualizar-perfil" type="submit" disabled={estadoPerfil.enviando}>{estadoPerfil.enviando ? "Guardando…" : "Actualizar datos"}</button>
        </form>

        <section className="seguridad-perfil-usuario" aria-labelledby="titulo-contrasena-usuario">
          <header><span><IconoPerfil tipo="candado" /></span><div><p>Seguridad</p><h2 id="titulo-contrasena-usuario">Cambiar contraseña</h2><small>Por seguridad siempre solicitaremos tu contraseña actual.</small></div></header>
          {estadoContrasena.error && <p className="mensaje-error" role="alert">{estadoContrasena.error}</p>}
          {estadoContrasena.mensaje && <p className="mensaje-exito" role="status">{estadoContrasena.mensaje}</p>}
          <form onSubmit={enviarCambio}>
            <label htmlFor="contrasenaActual">Contraseña actual</label>
            <input id="contrasenaActual" type="password" autoComplete="current-password" required maxLength="128" value={datosContrasena.contrasenaActual} onChange={(evento) => establecerDatosContrasena({ ...datosContrasena, contrasenaActual: evento.target.value })} />
            <label htmlFor="contrasenaNueva">Contraseña nueva</label>
            <input id="contrasenaNueva" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datosContrasena.contrasenaNueva} onChange={(evento) => establecerDatosContrasena({ ...datosContrasena, contrasenaNueva: evento.target.value })} />
            <button type="submit" disabled={estadoContrasena.enviando}>Actualizar contraseña</button>
          </form>
        </section>
      </main>
    </div>
  );
}

function IconoModulo({ tipo }) {
  const propiedades = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round" };

  if (tipo === "usuarios") {
    return <svg {...propiedades}><circle cx="23" cy="23" r="8" /><circle cx="44" cy="25" r="7" /><path d="M8 52c1-10 8-16 18-16s17 6 18 16M38 38c9 0 15 5 17 14" /></svg>;
  }
  if (tipo === "publicaciones") {
    return <svg {...propiedades}><rect x="10" y="12" width="44" height="40" rx="4" /><path d="M21 22h23M21 32h23M21 42h14M15 22h1M15 32h1M15 42h1" /></svg>;
  }
  if (tipo === "eventos") {
    return <svg {...propiedades}><rect x="10" y="14" width="44" height="40" rx="5" /><path d="M20 9v10M44 9v10M10 26h44M21 36h1M32 36h1M43 36h1M21 45h1M32 45h1" /></svg>;
  }
  if (tipo === "areas") {
    return <svg {...propiedades}><path d="m10 16 15-6 14 6 15-6v38l-15 6-14-6-15 6Z" /><path d="M25 10v38M39 16v38" /><path d="M32 23c-4 0-7 3-7 7 0 6 7 13 7 13s7-7 7-13c0-4-3-7-7-7Z" /></svg>;
  }
  if (tipo === "bicicletas") {
    return <svg {...propiedades}><circle cx="17" cy="46" r="8" /><circle cx="48" cy="46" r="8" /><path d="m17 46 11-22h10l10 22M23 34h14M30 17h10M29 24l-6-7M37 24l5-8" /></svg>;
  }
  if (tipo === "institucional") {
    return <svg {...propiedades}><path d="M18 9h23l10 10v36H18Z" /><path d="M41 9v11h10M25 31h18M25 40h18M25 49h11" /><path d="M12 15v40h31" /></svg>;
  }
  if (tipo === "reportes") {
    return <svg {...propiedades}><path d="M12 54V10h40v44Z" /><path d="M20 44V33h7v11M31 44V24h7v20M42 44V17h7v27M19 49h30" /></svg>;
  }
  if (tipo === "solicitudes") {
    return <svg {...propiedades}><path d="M17 9h30v46H17Z" /><path d="M24 20h16M24 29h16M24 38h10" /><path d="m38 45 4 4 8-9" /></svg>;
  }
  return <svg {...propiedades}><path d="M18 9h23l10 10v36H18Z" /><path d="M41 9v11h10M25 31h18M25 40h18M25 49h11" /><circle cx="31" cy="25" r="5" /></svg>;
}
