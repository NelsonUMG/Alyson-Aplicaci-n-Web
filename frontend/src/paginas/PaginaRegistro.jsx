import { useState } from "react";
import { Link } from "react-router-dom";
import { registrarCuenta } from "../api/autenticacion";

const datosIniciales = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasena: "",
  confirmarContrasena: "",
  aceptaTerminos: false,
};

export function PaginaRegistro() {
  const [datos, setDatos] = useState(datosIniciales);
  const [estado, setEstado] = useState({ enviando: false, error: "", mensaje: "" });

  function actualizarCampo(evento) {
    const { name, value, checked, type } = evento.target;
    setDatos((actuales) => ({ ...actuales, [name]: type === "checkbox" ? checked : value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (datos.contrasena !== datos.confirmarContrasena) {
      setEstado({ enviando: false, error: "Las contraseñas no coinciden.", mensaje: "" });
      return;
    }

    setEstado({ enviando: true, error: "", mensaje: "" });
    try {
      const respuesta = await registrarCuenta({
        nombre: datos.nombre,
        apellido: datos.apellido,
        correo: datos.correo,
        contrasena: datos.contrasena,
        aceptaTerminos: datos.aceptaTerminos,
      });
      setDatos(datosIniciales);
      setEstado({ enviando: false, error: "", mensaje: respuesta.mensaje });
    } catch (error) {
      setEstado({ enviando: false, error: error.message, mensaje: "" });
    }
  }

  return (
    <main className="pagina-formulario">
      <Link className="enlace-regreso" to="/">← Volver al inicio</Link>
      <div className="tarjeta-formulario tarjeta-formulario-amplia">
        <p className="etiqueta-fase">Registro de Cuenta</p>
        <h1>Crear cuenta</h1>
        <p>No se solicita DPI/CUI para el registro inicial.</p>
        {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
        {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
        <form onSubmit={enviar}>
          <div className="campos-en-linea">
            <div>
              <label htmlFor="nombre">Nombre</label>
              <input id="nombre" name="nombre" required maxLength="80" value={datos.nombre} onChange={actualizarCampo} />
            </div>
            <div>
              <label htmlFor="apellido">Apellido</label>
              <input id="apellido" name="apellido" required maxLength="80" value={datos.apellido} onChange={actualizarCampo} />
            </div>
          </div>
          <label htmlFor="correo">Correo electrónico</label>
          <input id="correo" name="correo" type="email" autoComplete="email" required maxLength="254" value={datos.correo} onChange={actualizarCampo} />
          <label htmlFor="contrasena">Contraseña</label>
          <input id="contrasena" name="contrasena" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datos.contrasena} onChange={actualizarCampo} />
          <label htmlFor="confirmarContrasena">Confirmar contraseña</label>
          <input id="confirmarContrasena" name="confirmarContrasena" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datos.confirmarContrasena} onChange={actualizarCampo} />
          <label className="opcion-verificacion" htmlFor="aceptaTerminos">
            <input id="aceptaTerminos" name="aceptaTerminos" type="checkbox" required checked={datos.aceptaTerminos} onChange={actualizarCampo} />
            <span>Acepto las condiciones de uso aplicables.</span>
          </label>
          <button type="submit" disabled={estado.enviando}>
            {estado.enviando ? "Registrando…" : "Crear cuenta"}
          </button>
        </form>
        <p className="ayuda-formulario">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Iniciar sesión</Link></p>
      </div>
    </main>
  );
}
