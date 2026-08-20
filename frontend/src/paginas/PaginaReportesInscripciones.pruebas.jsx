import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiReportes = vi.hoisted(() => ({
  listarReporteInscripciones: vi.fn(),
  listarPersonasInscritasReporte: vi.fn(),
}));

vi.mock("../api/administracionReportes", () => apiReportes);

import { PaginaReportesInscripciones } from "./PaginaReportesInscripciones";

const curso = {
  idEvento: 7,
  titulo: "Fútbol infantil",
  lugar: "Cancha 2",
  iniciaEn: "2026-08-20T15:00:00Z",
  finalizaEn: "2026-08-20T17:00:00Z",
  estado: "PUBLICADO",
  cantidadPersonasInscritas: 1,
};

describe("Reportes de inscripciones", () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiReportes.listarReporteInscripciones.mockReset().mockResolvedValue({
      contenido: [curso], pagina: 0, totalPaginas: 1, totalElementos: 1,
    });
    apiReportes.listarPersonasInscritasReporte.mockReset().mockResolvedValue({
      contenido: [{
        idInscripcionEvento: 31,
        idUsuario: 12,
        nombre: "Ana",
        apellido: "López",
        correo: "ana@example.com",
        confirmadaEn: "2026-08-10T18:00:00Z",
      }],
      pagina: 0,
      totalPaginas: 1,
      totalElementos: 1,
    });
  });

  it("muestra cursos, conteo y personas inscritas con el horario actual", async () => {
    render(<MemoryRouter><PaginaReportesInscripciones /></MemoryRouter>);

    expect(await screen.findByText("Fútbol infantil")).toBeTruthy();
    expect(screen.getByText("Cancha 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver personas" }));

    expect(await screen.findByText("Ana López")).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
    expect(screen.getAllByText("Horario general · sin grupos configurados").length).toBeGreaterThan(0);
    expect(apiReportes.listarPersonasInscritasReporte).toHaveBeenCalledWith(7, { busqueda: "" });
  });

  it("filtra cursos automáticamente mientras se escribe", async () => {
    render(<MemoryRouter><PaginaReportesInscripciones /></MemoryRouter>);
    await screen.findByText("Fútbol infantil");

    fireEvent.change(screen.getByLabelText("Buscar curso o actividad"), {
      target: { value: "futbol" },
    });

    await vi.waitFor(() => expect(apiReportes.listarReporteInscripciones)
      .toHaveBeenLastCalledWith({ busqueda: "futbol" }));
  });
});
