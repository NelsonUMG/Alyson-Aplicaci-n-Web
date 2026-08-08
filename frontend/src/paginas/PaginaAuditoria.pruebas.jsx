import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiAuditoria = vi.hoisted(() => ({
  listarEventosAuditoria: vi.fn(),
}));

vi.mock("../api/administracionAuditoria", () => apiAuditoria);

import { PaginaAuditoria } from "./PaginaAuditoria";

describe("Consulta de auditoría", () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiAuditoria.listarEventosAuditoria.mockReset().mockResolvedValue({
      contenido: [{
        idEventoAuditoria: 12,
        idUsuarioActor: 5,
        nombreActor: "Nelson Prueba",
        codigoAccion: "ESTADOBICICLETAACTUALIZADO",
        tipoRecurso: "BICICLETA",
        idRecurso: "7",
        resultado: "EXITOSO",
        idCorrelacion: "38572cf8-c15e-4e1c-a52f-416b046e3b41",
        ocurridoEn: "2026-08-03T18:00:00Z",
      }],
      pagina: 0,
      tamano: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });
  });

  it("presenta eventos de solo lectura con actor y correlación", async () => {
    render(<MemoryRouter><PaginaAuditoria /></MemoryRouter>);

    expect(await screen.findByText("ESTADOBICICLETAACTUALIZADO")).toBeTruthy();
    expect(screen.getByText("Nelson Prueba")).toBeTruthy();
    expect(screen.getByText("38572cf8-c15e-4e1c-a52f-416b046e3b41")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /eliminar/i })).toBeNull();
  });

  it("envía filtros autorizados a la API", async () => {
    render(<MemoryRouter><PaginaAuditoria /></MemoryRouter>);
    await screen.findByText("ESTADOBICICLETAACTUALIZADO");

    fireEvent.change(screen.getByLabelText("Acción"), { target: { value: "INICIOSESION" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(apiAuditoria.listarEventosAuditoria).toHaveBeenLastCalledWith(
      expect.objectContaining({ accion: "INICIOSESION" }),
    );
  });
});
