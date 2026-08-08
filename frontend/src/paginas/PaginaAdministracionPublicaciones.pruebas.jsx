import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiAdministracion = vi.hoisted(() => ({
  actualizarCategoria: vi.fn(),
  actualizarPublicacion: vi.fn(),
  agregarImagenPublicacion: vi.fn(),
  archivarPublicacion: vi.fn(),
  crearCategoria: vi.fn(),
  crearPublicacion: vi.fn(),
  despublicarPublicacion: vi.fn(),
  eliminarImagenPublicacion: vi.fn(),
  listarCategoriasAdministradas: vi.fn(),
  listarImagenesPublicacion: vi.fn(),
  listarPublicacionesAdministradas: vi.fn(),
  previsualizarPublicacion: vi.fn(),
  publicarPublicacion: vi.fn(),
}));

vi.mock("../api/administracionPublicaciones", () => apiAdministracion);
vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => ({
    usuario: {
      permisos: ["PUBLICACIONLEER", "PUBLICACIONCREAR", "PUBLICACIONACTUALIZAR", "PUBLICACIONELIMINAR"],
    },
  }),
}));

import { PaginaAdministracionPublicaciones } from "./PaginaAdministracionPublicaciones";

describe("Administración de publicaciones", () => {
  beforeEach(() => {
    apiAdministracion.listarCategoriasAdministradas.mockReset().mockResolvedValue([{
      idCategoriaPublicacion: 1,
      codigo: "NOTICIAS",
      nombre: "Noticias",
      descripcion: "Información oficial",
      ordenVisualizacion: 0,
      activa: true,
      version: 0,
    }]);
    apiAdministracion.listarPublicacionesAdministradas.mockReset().mockResolvedValue({
      contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
    });
  });

  it("carga categorías y permite abrir un borrador nuevo", async () => {
    render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);

    expect(await screen.findByText("NOTICIAS · Activa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Nueva publicación" }));

    expect(screen.getByRole("heading", { name: "Nueva publicación" })).toBeTruthy();
    expect(screen.getAllByLabelText("Categoría").at(-1).value).toBe("1");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });
});
