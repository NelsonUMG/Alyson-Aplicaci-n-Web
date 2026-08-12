import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiBicicletas = vi.hoisted(() => ({
  actualizarBicicleta: vi.fn(),
  cambiarEstadoBicicleta: vi.fn(),
  consultarBicicletaAdministrada: vi.fn(),
  crearBicicleta: vi.fn(),
  listarBicicletasAdministradas: vi.fn(),
  listarHistorialBicicleta: vi.fn(),
}));

vi.mock("../api/administracionBicicletas", () => apiBicicletas);
vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => ({
    usuario: {
      permisos: ["BICICLETALEER", "BICICLETACREAR", "BICICLETAACTUALIZARESTADO"],
    },
  }),
}));

import { PaginaAdministracionBicicletas } from "./PaginaAdministracionBicicletas";

const bicicleta = {
  idBicicleta: 7,
  codigo: "BIC007",
  estado: "PRESTADA",
  observacionesInventario: "Canasta frontal",
  tienePrestamoActivo: true,
  nombreActualizadoPor: "Nelson Prueba",
  creadoEn: "2026-08-03T18:00:00Z",
  actualizadoEn: "2026-08-03T18:00:00Z",
  version: 2,
};

describe("Administración de bicicletas", () => {
  beforeEach(() => {
    Object.values(apiBicicletas).forEach((funcion) => funcion.mockReset());
    apiBicicletas.listarBicicletasAdministradas.mockResolvedValue({
      contenido: [bicicleta],
      pagina: 0,
      totalPaginas: 1,
      totalElementos: 1,
    });
    apiBicicletas.consultarBicicletaAdministrada.mockResolvedValue(bicicleta);
    apiBicicletas.listarHistorialBicicleta.mockResolvedValue([{
      idHistorialEstadoBicicleta: 10,
      estadoAnterior: "DISPONIBLE",
      estadoNuevo: "PRESTADA",
      motivo: "Préstamo vigente",
      nombreCambiadoPor: "Nelson Prueba",
      cambiadoEn: "2026-08-03T18:00:00Z",
    }]);
  });

  it("abre el registro sin ofrecer estados asociados a préstamos", async () => {
    render(<MemoryRouter><PaginaAdministracionBicicletas /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Nueva bicicleta" }));

    expect(screen.getByRole("button", { name: "Ocultar Bicicleta" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Registrar bicicleta" })).toBeTruthy();
    expect(screen.getByLabelText("Estado inicial").textContent).not.toContain("PRESTADA");
    expect(screen.getByLabelText("Motivo del estado inicial")).toBeTruthy();
  });

  it("señala un préstamo activo y presenta el historial sin datos de la persona usuaria", async () => {
    render(<MemoryRouter><PaginaAdministracionBicicletas /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /BIC007/ }));

    expect(await screen.findByText(/tiene un préstamo activo/i)).toBeTruthy();
    expect(screen.getByText("DISPONIBLE → PRESTADA")).toBeTruthy();
    expect(screen.queryByText(/correo/i)).toBeNull();
  });
});
