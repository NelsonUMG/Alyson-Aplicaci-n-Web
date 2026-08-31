import { MemoryRouter } from "react-router-dom";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiPortal = vi.hoisted(() => ({
  listarCategoriasPublicacion: vi.fn(),
  listarPublicaciones: vi.fn(),
  listarEventos: vi.fn(),
  listarAreas: vi.fn(),
  consultarContenidoInstitucional: vi.fn(),
}));

vi.mock("../api/portalPublico", () => apiPortal);

import { PaginaAreasServicios } from "./PaginaAreasServicios";
import { PaginaBase } from "./PaginaBase";
import { PaginaEventos } from "./PaginaEventos";
import { PaginaNoticias } from "./PaginaNoticias";

function mostrar(componente) {
  return render(<MemoryRouter>{componente}</MemoryRouter>);
}

describe("Portal público", () => {
  afterEach(cleanup);

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

  it("limita a veinticinco palabras el resumen mostrado en cada tarjeta", async () => {
    const resumenCompleto = Array.from({ length: 55 }, (_, indice) => `palabra${indice + 1}`).join(" ");
    const resumenEsperado = `${Array.from({ length: 25 }, (_, indice) => `palabra${indice + 1}`).join(" ")}…`;
    apiPortal.listarPublicaciones.mockResolvedValue({
      contenido: [{
        identificadorUrl: "noticia-extensa",
        titulo: "Noticia extensa",
        resumen: resumenCompleto,
        nombreCategoria: "Noticias",
      }],
      pagina: 0,
      tamano: 5,
      totalElementos: 1,
      totalPaginas: 1,
    });

    mostrar(<PaginaNoticias />);

    expect(await screen.findByText(resumenEsperado)).toBeTruthy();
    expect(screen.queryByText(resumenCompleto)).toBeNull();
  });

  it("recorre las noticias cada diez segundos y vuelve a comenzar", async () => {
    vi.useFakeTimers();
    apiPortal.listarPublicaciones.mockResolvedValue({
      contenido: [
        {
          identificadorUrl: "primera-noticia",
          titulo: "Primera noticia",
          resumen: "Primer resumen",
          nombreCategoria: "Noticias",
        },
        {
          identificadorUrl: "segunda-noticia",
          titulo: "Segunda noticia",
          resumen: "Segundo resumen",
          nombreCategoria: "Actividades",
        },
      ],
      pagina: 0,
      tamano: 5,
      totalElementos: 2,
      totalPaginas: 1,
    });

    try {
      mostrar(<PaginaBase />);
      await act(async () => Promise.resolve());

      expect(screen.getByRole("heading", { name: "Primera noticia" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Leer más" }).getAttribute("href"))
        .toBe("/noticias/primera-noticia");
      expect(screen.queryByRole("link", { name: /Ver todas las noticias/i })).toBeNull();
      expect(screen.queryByText(/Siguiente noticia/)).toBeNull();

      for (let segundo = 0; segundo < 10; segundo += 1) {
        act(() => vi.advanceTimersByTime(1000));
      }

      expect(screen.getByRole("heading", { name: "Segunda noticia" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Leer más" }).getAttribute("href"))
        .toBe("/noticias/segunda-noticia");
      expect(screen.queryByText(/Siguiente noticia/)).toBeNull();

      for (let segundo = 0; segundo < 10; segundo += 1) {
        act(() => vi.advanceTimersByTime(1000));
      }

      expect(screen.getByRole("heading", { name: "Primera noticia" })).toBeTruthy();
      expect(screen.queryByText(/Siguiente noticia/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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

  it("no inventa tarjetas provisionales cuando aún no hay áreas completas", async () => {
    mostrar(<PaginaAreasServicios />);

    expect(await screen.findByText("Aún no hay áreas con información e imagen completas para mostrar.")).toBeTruthy();
    expect(screen.queryByText("Información pendiente")).toBeNull();
  });

  it("muestra el contenido institucional entregado por el servicio", async () => {
    const { PaginaNosotros } = await import("./PaginaNosotros");
    mostrar(<PaginaNosotros />);

    expect(await screen.findByText("Misión institucional desde el servicio.")).toBeTruthy();
    expect(screen.getByText("Valores institucionales desde el servicio.")).toBeTruthy();
  });
});
