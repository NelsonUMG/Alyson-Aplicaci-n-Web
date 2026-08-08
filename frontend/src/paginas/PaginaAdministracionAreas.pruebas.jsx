import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiAreas = vi.hoisted(() => ({
  actualizarArea: vi.fn(),
  actualizarCategoriaArea: vi.fn(),
  actualizarConexionMapa: vi.fn(),
  actualizarNodoMapa: vi.fn(),
  actualizarReservaArea: vi.fn(),
  agregarImagenArea: vi.fn(),
  crearArea: vi.fn(),
  crearCategoriaArea: vi.fn(),
  crearConexionMapa: vi.fn(),
  crearNodoMapa: vi.fn(),
  crearReservaArea: vi.fn(),
  eliminarConexionMapa: vi.fn(),
  eliminarImagenArea: vi.fn(),
  eliminarNodoMapa: vi.fn(),
  listarAreasAdministradas: vi.fn(),
  listarCategoriasArea: vi.fn(),
  listarConexionesMapa: vi.fn(),
  listarHistorialArea: vi.fn(),
  listarNodosMapa: vi.fn(),
  listarReservasArea: vi.fn(),
}));

vi.mock("../api/administracionAreas", () => apiAreas);
vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => ({ usuario: { permisos: ["AREALEER", "AREAACTUALIZARESTADO"] } }),
}));

import { PaginaAdministracionAreas } from "./PaginaAdministracionAreas";

describe("Administración de áreas", () => {
  beforeEach(() => {
    apiAreas.listarCategoriasArea.mockReset().mockResolvedValue([{
      idCategoriaArea: 1,
      codigo: "DEPORTE",
      nombre: "Deporte",
      descripcion: "",
      activa: true,
      version: 0,
    }]);
    apiAreas.listarAreasAdministradas.mockReset().mockResolvedValue({
      contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
    });
    apiAreas.listarNodosMapa.mockReset().mockResolvedValue([]);
    apiAreas.listarConexionesMapa.mockReset().mockResolvedValue([]);
  });

  it("carga el inventario y abre el formulario completo de una nueva área", async () => {
    render(<MemoryRouter><PaginaAdministracionAreas /></MemoryRouter>);

    expect(await screen.findByText("DEPORTE")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Nueva área" }));

    expect(screen.getByRole("heading", { name: "Registrar área" })).toBeTruthy();
    expect(screen.getAllByLabelText("Coordenadas confirmadas")).toHaveLength(2);
    expect(screen.getByLabelText("Observaciones internas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar área" })).toBeTruthy();
  });
});
