import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const apiInscripciones = vi.hoisted(() => ({ listarMisInscripciones: vi.fn() }));

vi.mock("../api/inscripcionesEventos", () => apiInscripciones);

import { PaginaMisInscripciones } from "./PaginaMisInscripciones";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Panel de inscripciones del usuario", () => {
  it("presenta un estado vacío amigable sin paginación innecesaria", async () => {
    apiInscripciones.listarMisInscripciones.mockResolvedValue({ contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 });

    render(<MemoryRouter><PaginaMisInscripciones /></MemoryRouter>);

    await waitFor(() => expect(apiInscripciones.listarMisInscripciones).toHaveBeenCalledWith({ pagina: 0 }));
    expect(await screen.findByRole("heading", { name: "Aún no tienes inscripciones" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Navegación de inscripciones" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Explorar eventos" })).toBeNull();
    expect(screen.getByRole("link", { name: /Ver próximos eventos/ })).toBeTruthy();
    expect(screen.queryByText(/Página 0 de 0/)).toBeNull();
  });

  it("muestra una inscripción con su estado y acceso al evento", async () => {
    apiInscripciones.listarMisInscripciones.mockResolvedValue({
      contenido: [{
        idInscripcionEvento: 8,
        identificadorUrl: "torneo-familiar",
        tituloEvento: "TORNEO FAMILIAR",
        estado: "CONFIRMADA",
        iniciaEn: "2030-09-10T15:00:00Z",
        lugar: "Cancha central",
        nombreGrupo: "Grupo A",
      }],
      pagina: 0,
      totalPaginas: 1,
      totalElementos: 1,
    });

    render(<MemoryRouter><PaginaMisInscripciones /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Torneo familiar" })).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
    expect(screen.getByText("Cancha central")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Consultar actividad/ }).getAttribute("href")).toBe("/eventos/torneo-familiar");
  });
});
