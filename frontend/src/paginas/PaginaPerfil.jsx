import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cambiarContrasena } from "../api/autenticacion";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { esUsuarioComun } from "../autenticacion/clasificacionUsuario";
import { MODULO_BICICLETAS_VISIBLE } from "../configuracion/modulos";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

export function PaginaPerfil() {
  const { usuario, cerrar } = usarSesion();
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
