import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiInstitucional = vi.hoisted(() => ({
  actualizarContenidoInstitucional: vi.fn(),
  consultarContenidoInstitucionalAdministrado: vi.fn(),
}));

vi.mock("../api/administracionInstitucional", () => apiInstitucional);

import { PaginaAdministracionInstitucional } from "./PaginaAdministracionInstitucional";

const contenidoInicial = {
  idContenidoInstitucional: 1,
  resumen: "Resumen original.",
  mision: "Misión original.",
  vision: "Visión original.",
  valores: "Valores originales.",
  version: 0,
};

describe("Administración de contenido institucional", () => {
  beforeEach(() => {
    apiInstitucional.consultarContenidoInstitucionalAdministrado.mockReset().mockResolvedValue(contenidoInicial);
    apiInstitucional.actualizarContenidoInstitucional.mockReset().mockResolvedValue({ ...contenidoInicial, resumen: "Resumen actualizado.", version: 1 });
  });

  it("carga y guarda el contenido que se muestra en Nosotros", async () => {
    render(<MemoryRouter><PaginaAdministracionInstitucional /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Editar contenido" }));
    expect(screen.getByRole("button", { name: "Ocultar Contenido" })).toBeTruthy();
    expect(screen.getByDisplayValue("Misión original.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Resumen institucional"), { target: { value: "Resumen actualizado." } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contenido institucional" }));

    expect(await screen.findByText("Contenido institucional actualizado.")).toBeTruthy();
    expect(apiInstitucional.actualizarContenidoInstitucional).toHaveBeenCalledWith({
      ...contenidoInicial,
      resumen: "Resumen actualizado.",
    });
  });
});
