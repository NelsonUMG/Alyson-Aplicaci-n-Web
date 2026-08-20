import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usarSesion } from "../autenticacion/ContextoSesion";
import { MarcaPortal } from "../componentes/EstructuraPortal";

export function PaginaInicioSesion() {
  const { iniciar } = usarSesion();
  const navegacion = useNavigate();
  const ubicacion = useLocation();
  const [datos, setDatos] = useState({ correo: "", contrasena: "", mantenerSesionActiva: false });
  const [estado, setEstado] = useState({ enviando: false, error: "" });

  function actualizarCampo(evento) {
    const { name, type, value, checked } = evento.target;
    setDatos((actuales) => ({ ...actuales, [name]: type === "checkbox" ? checked : value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setEstado({ enviando: true, error: "" });
    try {
      await iniciar(datos);
      const destino = typeof ubicacion.state?.desde === "string" && ubicacion.state.desde.startsWith("/")
        ? ubicacion.state.desde
        : "/perfil";
      navegacion(destino, { replace: true });
    } catch (error) {
      setEstado({ enviando: false, error: error.message });
    }
  }

  return (
    <main className="pagina-formulario pagina-inicio-sesion">
      <Link className="enlace-regreso enlace-regreso-inicio-sesion" to="/">← Volver al inicio</Link>
      <div className="tarjeta-formulario tarjeta-inicio-sesion">
        <div className="marca-identidad-acceso marca-identidad-inicio-sesion">
          <MarcaPortal mostrarDerechos={false} />
        </div>
        <p className="etiqueta-fase">Acceso a la plataforma</p>
        <h1>Iniciar sesión</h1>
        <p>Utiliza tus credenciales.</p>
        {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
        <form onSubmit={enviar}>
          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            required
            maxLength="254"
            value={datos.correo}
            onChange={actualizarCampo}
          />
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            required
            maxLength="128"
            value={datos.contrasena}
            onChange={actualizarCampo}
          />
          <label className="opcion-mantener-sesion" htmlFor="mantenerSesionActiva">
            <input
              id="mantenerSesionActiva"
              name="mantenerSesionActiva"
              type="checkbox"
              checked={datos.mantenerSesionActiva}
              onChange={actualizarCampo}
            />
            <span>Mantener sesión activa por 1 semana<small>No marques esta opción en un equipo compartido.</small></span>
          </label>
          <button type="submit" disabled={estado.enviando}>
            {estado.enviando ? "Comprobando…" : "Ingresar"}
          </button>
        </form>
        <p className="ayuda-formulario">¿Todavía no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
      </div>
    </main>
  );
}
