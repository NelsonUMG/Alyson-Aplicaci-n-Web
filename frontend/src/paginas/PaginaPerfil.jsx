import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cambiarContrasena } from "../api/autenticacion";
import { usarSesion } from "../autenticacion/ContextoSesion";

export function PaginaPerfil() {
  const { usuario, cerrar } = usarSesion();
  const navegacion = useNavigate();
  const [datos, setDatos] = useState({ contrasenaActual: "", contrasenaNueva: "" });
  const [estado, setEstado] = useState({ enviando: false, error: "", mensaje: "" });

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
          <h1>{usuario.nombre} {usuario.apellido}</h1>
          <p>{usuario.correo}</p>
        </div>
        <button className="boton-secundario" type="button" onClick={salir}>Cerrar sesión</button>
      </header>
      <section className="panel-cuenta" aria-labelledby="titulo-roles">
        <h2 id="titulo-roles">Roles asignados</h2>
        <ul className="lista-etiquetas">
          {usuario.roles.map((rol) => <li key={rol}>{rol}</li>)}
        </ul>
        {usuario.permisos.includes("ROLGESTIONAR") && (
          <Link className="enlace-principal" to="/administracion/usuarios">Administrar usuarios y roles</Link>
        )}
      </section>
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
    </main>
  );
}
