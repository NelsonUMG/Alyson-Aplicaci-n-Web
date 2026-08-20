import { useState } from "react";
import { Link } from "react-router-dom";
import { registrarCuenta } from "../api/autenticacion";
import { MarcaPortal } from "../componentes/EstructuraPortal";

const datosIniciales = {
  dpi: "",
  nombre: "",
  apellido: "",
  celular: "",
  fechaNacimiento: "",
  correo: "",
  contrasena: "",
  confirmarContrasena: "",
};

function fechaLocalActual() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

export function PaginaRegistro() {
  const [datos, setDatos] = useState(datosIniciales);
  const [etapa, setEtapa] = useState(1);
  const [estado, setEstado] = useState({ enviando: false, error: "", mensaje: "" });

  function actualizarCampo(evento) {
    const { name } = evento.target;
    let { value } = evento.target;
    if (["dpi", "celular"].includes(name)) value = value.replace(/\D/g, "");
    setDatos((actuales) => ({ ...actuales, [name]: value }));
    if (estado.error) setEstado((actual) => ({ ...actual, error: "" }));
  }

  function continuar(evento) {
    evento.preventDefault();
    if (datos.fechaNacimiento >= fechaLocalActual()) {
      setEstado({ enviando: false, error: "La fecha de nacimiento debe ser anterior a hoy.", mensaje: "" });
      return;
    }
    setEstado({ enviando: false, error: "", mensaje: "" });
    setEtapa(2);
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
        dpi: datos.dpi,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        celular: datos.celular,
        fechaNacimiento: datos.fechaNacimiento,
        correo: datos.correo.trim(),
        contrasena: datos.contrasena,
        confirmarContrasena: datos.confirmarContrasena,
      });
      setEstado({ enviando: false, error: "", mensaje: respuesta.mensaje });
      setEtapa(3);
    } catch (error) {
      setEstado({ enviando: false, error: error.message, mensaje: "" });
    }
  }

  return (
    <main className="pagina-formulario pagina-registro">
      <section className="tarjeta-formulario tarjeta-formulario-amplia tarjeta-registro" aria-labelledby="titulo-registro">
        <header className="cabecera-registro">
          <div className="marca-identidad-acceso"><MarcaPortal mostrarDerechos={false} /></div>
          <p className="etiqueta-fase">Crear cuenta</p>
          <h1 id="titulo-registro">{etapa === 1 ? "Datos personales" : etapa === 2 ? "Datos de acceso" : "Confirma tu correo"}</h1>
          <p>{etapa === 1
            ? "Completa tu información para identificar correctamente tu registro en el parque."
            : etapa === 2
              ? "Configura el correo y la contraseña que utilizarás para ingresar."
              : "Enviamos un enlace a la dirección que registraste. Debes confirmarla antes de iniciar sesión."}</p>
          {etapa < 3 && (
            <ol className="indicador-etapas-registro" aria-label="Progreso del registro">
              <li className={etapa === 1 ? "activo" : "completado"} aria-current={etapa === 1 ? "step" : undefined}>1<span>Datos personales</span></li>
              <li className={etapa === 2 ? "activo" : ""} aria-current={etapa === 2 ? "step" : undefined}>2<span>Correo y contraseña</span></li>
            </ol>
          )}
        </header>

        {estado.error && <p className="mensaje-error" role="alert">{estado.error}</p>}

        {etapa === 1 && (
          <form onSubmit={continuar}>
            <label htmlFor="dpi">Número de DPI/CUI</label>
            <input id="dpi" name="dpi" inputMode="numeric" autoComplete="off" required pattern="[0-9]{13}" minLength="13" maxLength="13" placeholder="13 dígitos" title="Ingresa exactamente los 13 números del DPI o CUI." value={datos.dpi} onChange={actualizarCampo} />
            <div className="campos-en-linea">
              <div>
                <label htmlFor="nombre">Nombres</label>
                <input id="nombre" name="nombre" autoComplete="given-name" required maxLength="80" placeholder="Nombres" value={datos.nombre} onChange={actualizarCampo} />
              </div>
              <div>
                <label htmlFor="apellido">Apellidos</label>
                <input id="apellido" name="apellido" autoComplete="family-name" required maxLength="80" placeholder="Apellidos" value={datos.apellido} onChange={actualizarCampo} />
              </div>
            </div>
            <label htmlFor="celular">Celular</label>
            <input id="celular" name="celular" type="tel" inputMode="numeric" autoComplete="tel" required pattern="[0-9]{8}" minLength="8" maxLength="8" placeholder="8 dígitos" title="Ingresa los 8 números del celular." value={datos.celular} onChange={actualizarCampo} />
            <label htmlFor="fechaNacimiento">Fecha de nacimiento</label>
            <input id="fechaNacimiento" name="fechaNacimiento" type="date" autoComplete="bday" required min="1900-01-01" max={fechaLocalActual()} value={datos.fechaNacimiento} onChange={actualizarCampo} />
            <button type="submit">Continuar →</button>
          </form>
        )}

        {etapa === 2 && (
          <form onSubmit={enviar}>
            <label htmlFor="correo">Correo electrónico</label>
            <input id="correo" name="correo" type="email" autoComplete="email" required maxLength="254" placeholder="nombre@correo.com" value={datos.correo} onChange={actualizarCampo} />
            <label htmlFor="contrasena">Contraseña</label>
            <input id="contrasena" name="contrasena" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datos.contrasena} onChange={actualizarCampo} />
            <small className="ayuda-campo-registro">Utiliza al menos 12 caracteres.</small>
            <label htmlFor="confirmarContrasena">Confirmar contraseña</label>
            <input id="confirmarContrasena" name="confirmarContrasena" type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={datos.confirmarContrasena} onChange={actualizarCampo} />
            <div className="acciones-registro">
              <button className="boton-registro-secundario" type="button" disabled={estado.enviando} onClick={() => setEtapa(1)}>← Regresar</button>
              <button type="submit" disabled={estado.enviando}>{estado.enviando ? "Creando cuenta…" : "Crear cuenta"}</button>
            </div>
          </form>
        )}

        {etapa === 3 && (
          <div className="registro-completado">
            <p className="mensaje-exito" role="status">{estado.mensaje}</p>
            <Link className="boton-enlace-registro" to="/verificar-correo">¿Necesitas otro enlace?</Link>
          </div>
        )}

        {etapa < 3 && <p className="ayuda-formulario">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Iniciar sesión</Link></p>}
      </section>
    </main>
  );
}
