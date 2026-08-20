import { useEffect, useState } from "react";
import { consultarResumenBicicletas } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const estadosBicicleta = [
  "DISPONIBLE",
  "PRESTADA",
  "ENMANTENIMIENTO",
  "DAÑADA",
  "NODEVUELTA",
  "FUERADESERVICIO",
];
const resumenVacio = { total: 0, disponibles: 0, cantidadesPorEstado: {}, actualizadoEn: null };

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(fecha));
}

export function PaginaBicicletas() {
  const [resumen, establecerResumen] = useState(resumenVacio);
  const [estado, establecerEstado] = useState({ cargando: true, error: "" });

  useEffect(() => {
    let vigente = true;
    consultarResumenBicicletas()
      .then((respuesta) => {
        if (vigente) {
          establecerResumen(respuesta);
          establecerEstado({ cargando: false, error: "" });
        }
      })
      .catch((error) => {
        if (vigente) establecerEstado({ cargando: false, error: error.message });
      });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <>
      <CabeceraPagina
        etiqueta="Consulta pública"
        titulo="Disponibilidad de bicicletas"
        descripcion="Consulta el inventario disponible informado por el personal autorizado del parque."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor bicicletas-resumen" aria-live="polite">
          {estado.cargando && <p className="portal-estado-carga">Consultando disponibilidad…</p>}
          {estado.error && <p className="portal-mensaje-error" role="alert">{estado.error}</p>}
          {!estado.cargando && !estado.error && (
            <>
              <div className="bicicletas-totales">
                <article>
                  <span>Disponibles</span>
                  <strong>{resumen.disponibles}</strong>
                </article>
                <article>
                  <span>Total registradas</span>
                  <strong>{resumen.total}</strong>
                </article>
              </div>
              <div className="bicicletas-estados" aria-label="Cantidad de bicicletas por estado">
                {estadosBicicleta.map((nombreEstado) => (
                  <article key={nombreEstado}>
                    <strong>{resumen.cantidadesPorEstado[nombreEstado] || 0}</strong>
                    <span>{formatearTextoTecnico(nombreEstado)}</span>
                  </article>
                ))}
              </div>
              <p className="bicicletas-actualizacion">
                {resumen.actualizadoEn
                  ? `Última actualización: ${formatearFecha(resumen.actualizadoEn)}.`
                  : "Información pendiente de actualización"}
              </p>
              <p className="bicicletas-aclaracion">
                Esta consulta muestra únicamente cantidades generales. La entrega de bicicletas se coordina con el personal responsable.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
