import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { solicitarRecuperacion, restablecerContrasena } from "../api/autenticacion";
import { IndicadorFortalezaContrasena } from "../componentes/IndicadorFortalezaContrasena";
import { MarcaPortal } from "../componentes/EstructuraPortal";

export function PaginaRecuperarContrasena() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token") || "";
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [estado, setEstado] = useState({ enviando: false, error: "", mensaje: "", completado: false });

  async function enviar(evento) {
    evento.preventDefault();
    if (token && contrasena !== confirmacion) {
      setEstado({ ...estado, error: "Las contraseñas no coinciden." });
      return;
    }
    setEstado({ enviando: true, error: "", mensaje: "", completado: false });
    try {
      const respuesta = token
        ? await restablecerContrasena({ token, contrasenaNueva: contrasena, confirmarContrasena: confirmacion })
        : await solicitarRecuperacion(correo.trim());
      setContrasena("");
      setConfirmacion("");
      setEstado({ enviando: false, error: "", mensaje: respuesta.mensaje, completado: true });
    } catch (error) {
      setEstado({ enviando: false, error: error.message, mensaje: "", completado: false });
    }
  }

  return (
    <main className="pagina-formulario pagina-inicio-sesion">
      <meta name="referrer" content="no-referrer" />
      <Link className="enlace-regreso enlace-regreso-inicio-sesion" to="/iniciar-sesion">← Volver a iniciar sesión</Link>
      <section className="tarjeta-formulario tarjeta-inicio-sesion tarjeta-recuperacion">
        <div className="marca-identidad-acceso"><MarcaPortal mostrarDerechos={false} /></div>
        <p className="etiqueta-fase">Recupera tu acceso</p>
        <h1>{token ? "Nueva contraseña" : "¿Olvidaste tu contraseña?"}</h1>
        <p>{token ? "Escribe y confirma tu nueva contraseña. El enlace vence una hora después de solicitarlo y solo puede usarse una vez." : "Ingresa tu correo y te enviaremos un enlace para cambiar tu contraseña. El enlace vence en 1 hora."}</p>
        {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}
        {estado.mensaje && <p className="mensaje-exito" role="status">{estado.mensaje}</p>}
        {!estado.completado && <form onSubmit={enviar}>
          {token ? <>
            <div className="campo-contrasena">
              <label htmlFor="contrasenaNueva">Nueva contraseña</label>
              <input id="contrasenaNueva" type="password" autoComplete="new-password" minLength="12" maxLength="128" required aria-describedby="fortalezaContrasenaRecuperacion" value={contrasena} onChange={(evento) => setContrasena(evento.target.value)} />
              <IndicadorFortalezaContrasena id="fortalezaContrasenaRecuperacion" contrasena={contrasena} />
            </div>
            <div className="campo-contrasena">
              <label htmlFor="confirmarContrasena">Confirmar contraseña</label>
              <input id="confirmarContrasena" type="password" autoComplete="new-password" minLength="12" maxLength="128" required value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} />
            </div>
          </> : <>
            <label htmlFor="correoRecuperacion">Correo electrónico</label>
            <input id="correoRecuperacion" type="email" autoComplete="email" maxLength="254" required value={correo} onChange={(evento) => setCorreo(evento.target.value)} />
          </>}
          <button type="submit" disabled={estado.enviando}>{estado.enviando ? "Enviando…" : token ? "Guardar contraseña" : "Enviar enlace de recuperación"}</button>
        </form>}
        {token && estado.error && <p><Link to="/recuperar-contrasena" onClick={() => setEstado({ enviando: false, error: "", mensaje: "", completado: false })}>Solicitar un enlace nuevo</Link></p>}
        {estado.completado && <p className="ayuda-formulario"><Link to="/iniciar-sesion">Volver a iniciar sesión</Link></p>}
      </section>
    </main>
  );
}
