import { Link } from "react-router-dom";
import { diagnosticarError } from "../utilidades/diagnosticoErrores";

export function PaginaEstado({ codigo, titulo, mensaje, referencia, textoAccion, alAccion, codigoSoporte, detalleSoporte, tipoError }) {
  const diagnostico = diagnosticarError({ estado: codigo, codigo: codigoSoporte });
  return (
    <main className="pagina-estado">
      <p className="codigo-estado" aria-label={`Error ${codigo}`}>{codigo}</p>
      <h1>{titulo || diagnostico.titulo}</h1>
      <p>{mensaje || diagnostico.mensajeUsuario}</p>
      <section className="detalle-error-soporte" aria-label="Información para soporte técnico">
        <p>Información para soporte técnico</p>
        <dl>
          <div><dt>Código</dt><dd><code>{codigoSoporte || diagnostico.codigoSoporte}</code></dd></div>
          <div><dt>Clasificación</dt><dd>{tipoError || diagnostico.tipo}</dd></div>
          {referencia && <div><dt>Referencia</dt><dd><code>{referencia}</code></dd></div>}
        </dl>
        <p>{detalleSoporte || diagnostico.detalleSoporte}</p>
      </section>
      <div className="acciones-pagina-estado">
        {alAccion && (
          <button className="enlace-principal" type="button" onClick={alAccion}>
            {textoAccion || "Intentar nuevamente"}
          </button>
        )}
        <Link className={alAccion ? "enlace-secundario" : "enlace-principal"} to="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
