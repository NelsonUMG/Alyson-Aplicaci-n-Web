import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiPortal = vi.hoisted(() => ({
  listarCategoriasPublicacion: vi.fn(),
  listarPublicaciones: vi.fn(),
  listarEventos: vi.fn(),
  listarAreas: vi.fn(),
  consultarContenidoInstitucional: vi.fn(),
}));

vi.mock("../api/portalPublico", () => apiPortal);

import { PaginaAreasServicios } from "./PaginaAreasServicios";
import { PaginaEventos } from "./PaginaEventos";
import { PaginaNoticias } from "./PaginaNoticias";

function mostrar(componente) {
  return render(<MemoryRouter>{componente}</MemoryRouter>);
}

describe("Portal público", () => {
  beforeEach(() => {
    apiPortal.listarCategoriasPublicacion.mockReset().mockResolvedValue([]);
    apiPortal.listarPublicaciones.mockReset().mockResolvedValue({
      contenido: [], pagina: 0, tamano: 5, totalElementos: 0, totalPaginas: 0,
    });
    apiPortal.listarEventos.mockReset().mockResolvedValue({
      contenido: [], pagina: 0, tamano: 10, totalElementos: 0, totalPaginas: 0,
    });
    apiPortal.listarAreas.mockReset().mockResolvedValue([]);
    apiPortal.consultarContenidoInstitucional.mockReset().mockResolvedValue({
      resumen: "Resumen institucional desde el servicio.",
      mision: "Misión institucional desde el servicio.",
      vision: "Visión institucional desde el servicio.",
      valores: "Valores institucionales desde el servicio.",
    });
  });

  it("conserva el estado vacío original cuando no existen publicaciones", async () => {
    mostrar(<PaginaNoticias />);

    expect(await screen.findByRole("heading", { name: "Aún no hay noticias publicadas" })).toBeTruthy();
    expect(screen.getByText("Las publicaciones aparecerán aquí.")).toBeTruthy();
  });

  it("muestra únicamente publicaciones públicas entregadas por la API", async () => {
    apiPortal.listarPublicaciones.mockResolvedValue({
      contenido: [{
        identificadorUrl: "jornada-recreativa",
        titulo: "Jornada recreativa",
        resumen: "Actividad confirmada",
        codigoCategoria: "NOTICIAS",
        nombreCategoria: "Noticias",
      }],
      pagina: 0,
      tamano: 5,
      totalElementos: 1,
      totalPaginas: 1,
    });

    mostrar(<PaginaNoticias />);

    expect(await screen.findByRole("heading", { name: "Jornada recreativa" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Leer publicación" }).getAttribute("href"))
      .toBe("/noticias/jornada-recreativa");
  });

  it("aplica filtros por fecha y tipo de actividad al buscar noticias", async () => {
    apiPortal.listarCategoriasPublicacion.mockResolvedValue([{ codigo: "ACTIVIDAD", nombre: "Actividad" }]);
    const vista = mostrar(<PaginaNoticias />);
    const noticias = within(vista.container);

    await noticias.findByRole("option", { name: "Actividad" });
    fireEvent.change(noticias.getByLabelText("Buscar noticias"), { target: { value: "bicicletas" } });
    fireEvent.change(noticias.getByLabelText("Tipo de actividad"), { target: { value: "ACTIVIDAD" } });
    fireEvent.change(noticias.getByLabelText("Fecha desde"), { target: { value: "2026-08-01" } });
    fireEvent.change(noticias.getByLabelText("Fecha hasta"), { target: { value: "2026-08-31" } });
    fireEvent.click(noticias.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(apiPortal.listarPublicaciones).toHaveBeenLastCalledWith({
      busqueda: "bicicletas",
      categoria: "ACTIVIDAD",
      fechaDesde: "2026-08-01",
      fechaHasta: "2026-08-31",
      pagina: 0,
      tamano: 6,
    }));
  });

  it("presenta cupos de eventos calculados por el servidor", async () => {
    apiPortal.listarEventos.mockResolvedValue({
      contenido: [{
        identificadorUrl: "curso-atletismo",
        titulo: "Curso de atletismo",
        descripcion: "Actividad confirmada",
        lugar: "Pista",
        iniciaEn: "2026-08-05T15:00:00Z",
        capacidadTotal: 30,
        cuposDisponibles: 12,
        estado: "PUBLICADO",
      }],
      pagina: 0,
      tamano: 10,
      totalElementos: 1,
      totalPaginas: 1,
    });

    mostrar(<PaginaEventos />);

    expect(await screen.findByRole("heading", { name: "Curso de atletismo" })).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("conserva las tarjetas provisionales cuando aún no hay áreas", async () => {
    mostrar(<PaginaAreasServicios />);

    expect(await screen.findByRole("heading", { name: "Áreas deportivas" })).toBeTruthy();
    expect(screen.getAllByText("Información pendiente")).toHaveLength(3);
  });

  it("muestra el contenido institucional entregado por el servicio", async () => {
    const { PaginaNosotros } = await import("./PaginaNosotros");
    mostrar(<PaginaNosotros />);

    expect(await screen.findByText("Misión institucional desde el servicio.")).toBeTruthy();
    expect(screen.getByText("Valores institucionales desde el servicio.")).toBeTruthy();
  });
});
