import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiPortal = vi.hoisted(() => ({
  consultarResumenBicicletas: vi.fn(),
}));

vi.mock("../api/portalPublico", () => apiPortal);

import { PaginaBicicletas } from "./PaginaBicicletas";

describe("Disponibilidad pública de bicicletas", () => {
  beforeEach(() => {
    apiPortal.consultarResumenBicicletas.mockReset().mockResolvedValue({
      total: 4,
      disponibles: 2,
      cantidadesPorEstado: {
        DISPONIBLE: 2,
        ENMANTENIMIENTO: 1,
        DAÑADA: 1,
      },
      actualizadoEn: "2026-08-03T18:00:00Z",
    });
  });

  it("muestra únicamente los totales autorizados por estado", async () => {
    render(<PaginaBicicletas />);

    expect(await screen.findByRole("heading", { name: "Disponibilidad de bicicletas" })).toBeTruthy();
    expect(screen.getByText("Total registradas").nextElementSibling.textContent).toBe("4");
    expect(screen.getByText("Disponibles").nextElementSibling.textContent).toBe("2");
    expect(screen.getByText("En mantenimiento").previousElementSibling.textContent).toBe("1");
    expect(screen.queryByText(/préstamo de/i)).toBeNull();
  });

  it("informa cuando el inventario todavía no tiene fecha de actualización", async () => {
    apiPortal.consultarResumenBicicletas.mockResolvedValue({
      total: 0,
      disponibles: 0,
      cantidadesPorEstado: {},
      actualizadoEn: null,
    });

    render(<PaginaBicicletas />);

    expect(await screen.findByText("Información pendiente de actualización")).toBeTruthy();
  });
});
