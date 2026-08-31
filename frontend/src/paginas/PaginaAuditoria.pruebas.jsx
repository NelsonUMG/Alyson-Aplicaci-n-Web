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
        codigoAccion: "Estado de bicicleta actualizado",
        tipoRecurso: "Bicicleta",
        idRecurso: "7",
        resultado: "Exitoso",
        idCorrelacion: "38572cf8-c15e-4e1c-a52f-416b046e3b41",
        ocurridoEn: "2026-08-03T18:00:00Z",
      }],
      pagina: 0,
      tamano: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });
  });

  it("presenta eventos de solo lectura sin exponer la correlación", async () => {
    render(<MemoryRouter><PaginaAuditoria /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Listado de auditoría" }));
    expect(await screen.findByText("Estado de bicicleta actualizado")).toBeTruthy();
    expect(screen.getByText("Bicicletas")).toBeTruthy();
    expect(screen.getAllByText("Exitoso").some((elemento) => elemento.tagName === "SPAN")).toBe(true);
    expect(screen.getByText("Registro 7")).toBeTruthy();
    expect(screen.getByText("Nelson Prueba")).toBeTruthy();
    expect(screen.queryByText("38572cf8-c15e-4e1c-a52f-416b046e3b41")).toBeNull();
    expect(screen.queryByText("Correlación")).toBeNull();
    expect(screen.getByLabelText("Id del registro")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /eliminar/i })).toBeNull();
  });

  it("envía filtros autorizados a la API", async () => {
    render(<MemoryRouter><PaginaAuditoria /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Listado de auditoría" }));
    await screen.findByText("Estado de bicicleta actualizado");

    fireEvent.change(screen.getByLabelText("Acción"), { target: { value: "INICIOSESION" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(apiAuditoria.listarEventosAuditoria).toHaveBeenLastCalledWith(
      expect.objectContaining({ accion: "INICIOSESION" }),
    );
  });

  it("resume la acción y presenta el módulo correspondiente", async () => {
    apiAuditoria.listarEventosAuditoria.mockResolvedValueOnce({
      contenido: [{
        idEventoAuditoria: 14,
        idUsuarioActor: 5,
        nombreActor: "Nelson Prueba",
        codigoAccion: "IMAGENPUBLICACIONAGREGADA",
        tipoRecurso: "CATEGORIAPUBLICACION",
        idRecurso: "2",
        resultado: "FALLIDO",
        idCorrelacion: "88572cf8-c15e-4e1c-a52f-416b046e3b45",
        ocurridoEn: "2026-08-03T18:00:00Z",
      }],
      pagina: 0,
      tamano: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });

    render(<MemoryRouter><PaginaAuditoria /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Listado de auditoría" }));
    expect(await screen.findByText("IMAGENPUBLICACIONAGREGADA")).toBeTruthy();
    expect(screen.getByText("Publicaciones")).toBeTruthy();
    expect(screen.getByText("Registro 2")).toBeTruthy();
    expect(screen.getAllByText("Fallido").some((elemento) => elemento.tagName === "SPAN")).toBe(true);
  });
});
