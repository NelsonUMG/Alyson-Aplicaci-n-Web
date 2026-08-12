import { fireEvent, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiAdministracion = vi.hoisted(() => ({
  actualizarCategoria: vi.fn(),
  actualizarPublicacion: vi.fn(),
  agregarImagenPublicacion: vi.fn(),
  archivarPublicacion: vi.fn(),
  crearCategoria: vi.fn(),
  crearPublicacion: vi.fn(),
  desarchivarPublicacion: vi.fn(),
  eliminarImagenPublicacion: vi.fn(),
  eliminarPublicacion: vi.fn(),
  listarCategoriasAdministradas: vi.fn(),
  listarImagenesPublicacion: vi.fn(),
  listarPublicacionesAdministradas: vi.fn(),
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
    apiAdministracion.listarImagenesPublicacion.mockReset().mockResolvedValue([]);
    apiAdministracion.desarchivarPublicacion.mockReset();
    apiAdministracion.eliminarPublicacion.mockReset();
  });

  it("carga categorías y permite abrir un borrador nuevo", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    await paginaActual.findByRole("button", { name: "Nueva categoría" });
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva categoría" }));
    expect(paginaActual.getByText("NOTICIAS · Activa")).toBeTruthy();
    expect(vista.container.querySelector("#codigoCategoria")).toBeTruthy();
    expect(paginaActual.getByRole("button", { name: "Ocultar Categoría" })).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Cancelar" }));
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    const tituloListado = paginaActual.getByRole("heading", { name: "Listado de publicaciones" });
    expect(within(tituloListado.closest("section")).queryByRole("button", { name: "Nueva publicación" })).toBeNull();
    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva publicación" }));

    const tituloPanelNuevo = paginaActual.getByRole("heading", { name: "Nueva publicación" });
    expect(tituloPanelNuevo.compareDocumentPosition(tituloListado) & 4).toBeTruthy();
    expect(vista.container.querySelector("#tituloPublicacion")).toBeTruthy();
    expect(paginaActual.getByRole("button", { name: "Ocultar Publicación" })).toBeTruthy();
    expect(vista.container.querySelector("#categoriaPublicacion").value).toBe("1");
    expect(paginaActual.getByRole("button", { name: "Guardar" })).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Cancelar" }));
    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
  });

  it("impide abrir una publicación nueva cuando no existen categorías activas", async () => {
    apiAdministracion.listarCategoriasAdministradas.mockResolvedValue([]);
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    const botonNuevo = await paginaActual.findByRole("button", { name: "Nueva publicación" });
    expect(botonNuevo.disabled).toBe(true);
    expect(paginaActual.getByText(/Primero crea al menos una categoría activa/)).toBeTruthy();
    fireEvent.click(botonNuevo);

    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
    expect(apiAdministracion.crearPublicacion).not.toHaveBeenCalled();
  });

  it("intercambia los paneles de categoría y publicación", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva categoría" }));
    expect(vista.container.querySelector("#codigoCategoria")).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva publicación" }));
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    expect(vista.container.querySelector("#tituloPublicacion")).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva categoría" }));
    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
    expect(vista.container.querySelector("#codigoCategoria")).toBeTruthy();
  });

  it("permite desarchivar una publicación archivada", async () => {
    const archivada = {
      idPublicacion: 9,
      idCategoriaPublicacion: 1,
      nombreCategoria: "Noticias",
      titulo: "Aviso archivado",
      identificadorUrl: "aviso-archivado",
      resumen: "Resumen",
      contenido: "Contenido",
      estado: "ARCHIVADA",
      fechaEditorial: null,
      version: 4,
    };
    apiAdministracion.listarPublicacionesAdministradas.mockResolvedValue({
      contenido: [archivada], pagina: 0, totalPaginas: 1, totalElementos: 1,
    });
    apiAdministracion.desarchivarPublicacion.mockResolvedValue({
      ...archivada, estado: "BORRADOR", version: 5,
    });

    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);
    fireEvent.click(await paginaActual.findByRole("button", { name: "Consultar" }));
    expect(paginaActual.queryByRole("button", { name: "Previsualizar" })).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Desarchivar" }));

    expect(apiAdministracion.desarchivarPublicacion).toHaveBeenCalledWith(9, 4);
    expect(await paginaActual.findByRole("button", { name: "Publicar" })).toBeTruthy();
  });

  it("confirma y elimina una publicación con su versión vigente", async () => {
    const publicada = {
      idPublicacion: 12,
      idCategoriaPublicacion: 1,
      nombreCategoria: "Noticias",
      titulo: "Noticia publicada",
      identificadorUrl: "noticia-publicada",
      resumen: "Resumen",
      contenido: "Contenido",
      estado: "PUBLICADA",
      fechaEditorial: null,
      version: 6,
    };
    apiAdministracion.listarPublicacionesAdministradas.mockResolvedValue({
      contenido: [publicada], pagina: 0, totalPaginas: 1, totalElementos: 1,
    });
    apiAdministracion.eliminarPublicacion.mockResolvedValue(undefined);
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
      const paginaActual = within(vista.container);
      fireEvent.click(await paginaActual.findByRole("button", { name: "Consultar" }));

      expect(paginaActual.queryByRole("button", { name: "Despublicar" })).toBeNull();
      const archivar = paginaActual.getByRole("button", { name: "Archivar" });
      const eliminar = paginaActual.getByRole("button", { name: "Eliminar publicación" });
      expect(archivar.parentElement).toBe(eliminar.parentElement);
      fireEvent.click(eliminar);

      expect(confirmar).toHaveBeenCalledOnce();
      expect(apiAdministracion.eliminarPublicacion).toHaveBeenCalledWith(12, 6);
    } finally {
      confirmar.mockRestore();
    }
  });
});
