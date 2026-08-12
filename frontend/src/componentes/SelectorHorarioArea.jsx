import { useState } from "react";

const diasSemana = [
  ["LUNES", "Lunes"],
  ["MARTES", "Martes"],
  ["MIERCOLES", "Miércoles"],
  ["JUEVES", "Jueves"],
  ["VIERNES", "Viernes"],
  ["SABADO", "Sábado"],
  ["DOMINGO", "Domingo"],
];

const nombresDias = Object.fromEntries(diasSemana);

function horarioVacio() {
  return { dias: [], abre: "", cierra: "" };
}

export function SelectorHorarioArea({ periodos = [], alCambiar, formatoAnterior = false }) {
  const [nuevoHorario, establecerNuevoHorario] = useState(horarioVacio);
  const [error, establecerError] = useState("");

  function alternarDia(dia) {
    establecerNuevoHorario((actual) => ({
      ...actual,
      dias: actual.dias.includes(dia)
        ? actual.dias.filter((valor) => valor !== dia)
        : [...actual.dias, dia],
    }));
    establecerError("");
  }

  function agregarHorario() {
    if (nuevoHorario.dias.length === 0) {
      establecerError("Selecciona al menos un día.");
      return;
    }
    if (!nuevoHorario.abre || !nuevoHorario.cierra) {
      establecerError("Selecciona la hora de apertura y la hora de cierre.");
      return;
    }
    if (nuevoHorario.cierra <= nuevoHorario.abre) {
      establecerError("La hora de cierre debe ser posterior a la hora de apertura.");
      return;
    }
    alCambiar([...periodos, { ...nuevoHorario }]);
    establecerNuevoHorario(horarioVacio());
    establecerError("");
  }

  return (
    <fieldset className="selector-horario-area">
      <legend>Horario del área</legend>
      <p>Selecciona los días y las horas. Puedes agregar varios horarios si cambian durante la semana.</p>
      {formatoAnterior && periodos.length === 0 && (
        <p className="mensaje-advertencia">
          El horario guardado usa un formato anterior. Al agregar uno nuevo será reemplazado.
        </p>
      )}
      <div className="selector-horario-dias" aria-label="Días del horario">
        {diasSemana.map(([valor, etiqueta]) => (
          <label key={valor}>
            <input
              type="checkbox"
              checked={nuevoHorario.dias.includes(valor)}
              onChange={() => alternarDia(valor)}
            />
            {etiqueta}
          </label>
        ))}
      </div>
      <div className="selector-horario-horas">
        <label>
          Hora de apertura
          <input
            type="time"
            value={nuevoHorario.abre}
            onChange={(evento) => establecerNuevoHorario({
              ...nuevoHorario,
              abre: evento.target.value,
            })}
          />
        </label>
        <label>
          Hora de cierre
          <input
            type="time"
            value={nuevoHorario.cierra}
            onChange={(evento) => establecerNuevoHorario({
              ...nuevoHorario,
              cierra: evento.target.value,
            })}
          />
        </label>
        <button type="button" onClick={agregarHorario}>Agregar horario</button>
      </div>
      {error && <p className="mensaje-error" role="alert">{error}</p>}
      <div className="selector-horario-periodos" aria-live="polite">
        {periodos.length === 0 ? (
          <p>Sin horario definido.</p>
        ) : periodos.map((periodo, indice) => (
          <div key={`${periodo.dias.join("-")}-${periodo.abre}-${periodo.cierra}-${indice}`}>
            <span>
              <strong>{periodo.dias.map((dia) => nombresDias[dia] || dia).join(", ")}</strong>
              <small>{periodo.abre} a {periodo.cierra}</small>
            </span>
            <button
              type="button"
              className="boton-peligro"
              onClick={() => alCambiar(periodos.filter((_, posicion) => posicion !== indice))}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
