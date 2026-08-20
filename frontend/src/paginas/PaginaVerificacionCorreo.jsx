import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmarCorreo, reenviarVerificacion } from "../api/autenticacion";
import { MarcaPortal } from "../componentes/EstructuraPortal";

export function PaginaVerificacionCorreo() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token") || "";
  const [estado, setEstado] = useState({ verificando: Boolean(token), mensaje: "", error: "" });
  const [correo, setCorreo] = useState("");
  const [reenvio, setReenvio] = useState({ enviando: false, mensaje: "", error: "" });

  useEffect(() => {
    let vigente = true;
    if (!token) return () => { vigente = false; };

    confirmarCorreo(token)
      .then((respuesta) => {
        if (vigente) setEstado({ verificando: false, mensaje: respuesta.mensaje, error: "" });
      })
      .catch((error) => {
        if (vigente) setEstado({ verificando: false, mensaje: "", error: error.message });
      });
    return () => { vigente = false; };
  }, [token]);

  async function reenviar(evento) {
    evento.preventDefault();
    setReenvio({ enviando: true, mensaje: "", error: "" });
    try {
      const respuesta = await reenviarVerificacion(correo.trim());
      setReenvio({ enviando: false, mensaje: respuesta.mensaje, error: "" });
    } catch (error) {
      setReenvio({ enviando: false, mensaje: "", error: error.message });
    }
  }

  const necesitaReenvio = !token || Boolean(estado.error);
  const titulo = estado.mensaje
    ? "Correo verificado"
    : estado.verificando
      ? "Verificando correo"
      : "Verificación de correo";
  return (
    <main className="pagina-formulario pagina-registro">
      <section className="tarjeta-formulario tarjeta-formulario-amplia tarjeta-registro" aria-labelledby="titulo-verificacion">
        <header className="cabecera-registro">
          <div className="marca-identidad-acceso"><MarcaPortal mostrarDerechos={false} /></div>
          <h1 id="titulo-verificacion">{titulo}</h1>
        </header>

        {estado.verificando && <p className="estado-carga" role="status">Verificando el enlace…</p>}
        {estado.mensaje && (
          <div className="registro-completado">
            <p className="mensaje-confirmacion-correo" role="status">{estado.mensaje}</p>
            <Link className="boton-enlace-registro" to="/iniciar-sesion">Ir a iniciar sesión</Link>
          </div>
        )}
        {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}

        {necesitaReenvio && (
          <form onSubmit={reenviar}>
            <p>{token ? "Solicita un enlace nuevo para completar la verificación." : "Ingresa el correo de la cuenta para recibir un enlace nuevo."}</p>
            <label htmlFor="correo-reenvio">Correo electrónico</label>
            <input id="correo-reenvio" type="email" autoComplete="email" required maxLength="254" value={correo} onChange={(evento) => setCorreo(evento.target.value)} />
            {reenvio.error && <p className="mensaje-error" role="alert">{reenvio.error}</p>}
            {reenvio.mensaje && <p className="mensaje-exito" role="status">{reenvio.mensaje}</p>}
            <button type="submit" disabled={reenvio.enviando}>{reenvio.enviando ? "Enviando…" : "Enviar nuevo enlace"}</button>
          </form>
        )}

        {!estado.mensaje && <p className="ayuda-formulario"><Link to="/iniciar-sesion">Volver a iniciar sesión</Link></p>}
      </section>
    </main>
  );
}
