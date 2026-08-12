import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SelectorHorarioArea } from "./SelectorHorarioArea";

afterEach(() => cleanup());

function SelectorControlado() {
  const [periodos, establecerPeriodos] = useState([]);
  return <SelectorHorarioArea periodos={periodos} alCambiar={establecerPeriodos} />;
}

describe("Selector de horario de un área", () => {
  it("permite elegir días y horas sin escribir JSON", () => {
    render(<SelectorControlado />);

    fireEvent.click(screen.getByLabelText("Lunes"));
    fireEvent.click(screen.getByLabelText("Martes"));
    fireEvent.change(screen.getByLabelText("Hora de apertura"), { target: { value: "08:00" } });
    fireEvent.change(screen.getByLabelText("Hora de cierre"), { target: { value: "17:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar horario" }));

    expect(screen.getByText("Lunes, Martes")).toBeTruthy();
    expect(screen.getByText("08:00 a 17:30")).toBeTruthy();
    expect(screen.queryByText("Sin horario definido.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(screen.getByText("Sin horario definido.")).toBeTruthy();
  });

  it("evita guardar un cierre anterior a la apertura", () => {
    render(<SelectorControlado />);

    fireEvent.click(screen.getByLabelText("Viernes"));
    fireEvent.change(screen.getByLabelText("Hora de apertura"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Hora de cierre"), { target: { value: "09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar horario" }));

    expect(screen.getByRole("alert").textContent)
      .toBe("La hora de cierre debe ser posterior a la hora de apertura.");
  });
});
