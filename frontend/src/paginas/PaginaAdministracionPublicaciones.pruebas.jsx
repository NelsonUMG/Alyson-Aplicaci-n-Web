import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiAdministracion = vi.hoisted(() => ({
  actualizarCategoria: vi.fn(),
  actualizarPublicacion: vi.fn(),
  agregarImagenPublicacion: vi.fn(),
  archivarPublicacion: vi.fn(),
  crearCategoria: vi.fn(),
  crearPublicacion: vi.fn(),
  desarchivarPublicacion: vi.fn(),
  eliminarCategoria: vi.fn(),
  eliminarImagenPublicacion: vi.fn(),
  eliminarPublicacion: vi.fn(),
  establecerPortadaPublicacion: vi.fn(),
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

describe("Administración de noticias", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    apiAdministracion.listarCategoriasAdministradas.mockReset().mockResolvedValue([{
      idCategoriaPublicacion: 1,
      codigo: "NOTICIAS",
      nombre: "Noticias",
      descripcion: "Información oficial",
      ordenVisualizacion: 1,
      activa: true,
      version: 0,
    }]);
    apiAdministracion.listarPublicacionesAdministradas.mockReset().mockResolvedValue({
      contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
    });
    apiAdministracion.listarImagenesPublicacion.mockReset().mockResolvedValue([]);
    apiAdministracion.agregarImagenPublicacion.mockReset();
    apiAdministracion.establecerPortadaPublicacion.mockReset();
    apiAdministracion.actualizarCategoria.mockReset().mockResolvedValue();
    apiAdministracion.crearCategoria.mockReset().mockResolvedValue();
    apiAdministracion.crearPublicacion.mockReset();
    apiAdministracion.desarchivarPublicacion.mockReset();
    apiAdministracion.eliminarCategoria.mockReset().mockResolvedValue();
    apiAdministracion.eliminarPublicacion.mockReset();
  });

  it("carga categorías y permite abrir un borrador nuevo", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    await paginaActual.findByRole("button", { name: "Nueva categoría" });
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva categoría" }));
    expect(paginaActual.getByRole("button", { name: /1Noticias/ })).toBeTruthy();
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    expect(paginaActual.getByLabelText("Orden de categorías").value).toBe("2");
    expect(paginaActual.queryByText(/Números disponibles/)).toBeNull();
    expect(paginaActual.queryByLabelText("Categoría activa")).toBeNull();
    expect(paginaActual.getByRole("button", { name: "Nueva categoría" }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(paginaActual.getByRole("button", { name: "Cancelar" }));
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    expect(paginaActual.queryByRole("heading", { name: "Listado de noticias" })).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Listado de noticias" }));
    const tituloListado = paginaActual.getByRole("heading", { name: "Listado de noticias" });
    expect(within(tituloListado.closest("section")).queryByRole("button", { name: "Nueva noticia" })).toBeNull();
    expect(paginaActual.getByRole("button", { name: "Listado de noticias" }).getAttribute("aria-expanded")).toBe("true");
    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva noticia" }));

    const tituloPanelNuevo = paginaActual.getByRole("heading", { name: "Nueva noticia" });
    expect(tituloPanelNuevo).toBeTruthy();
    expect(paginaActual.queryByRole("heading", { name: "Listado de noticias" })).toBeNull();
    expect(vista.container.querySelector("#tituloPublicacion")).toBeTruthy();
    expect(paginaActual.getByRole("button", { name: "Nueva noticia" }).getAttribute("aria-expanded")).toBe("true");
    expect(vista.container.querySelector("#categoriaPublicacion").value).toBe("1");
    expect(paginaActual.getByRole("button", { name: "Guardar" })).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Cancelar" }));
    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
  });

  it("presenta el módulo como Noticias y amplía los campos al escribir", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    expect(await paginaActual.findByRole("heading", { name: "Noticias", level: 1 })).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva noticia" }));

    const resumen = paginaActual.getByLabelText("Resumen");
    const contenido = paginaActual.getByLabelText("Contenido");
    expect(resumen.classList.contains("area-texto-autoexpandible")).toBe(true);
    expect(contenido.classList.contains("area-texto-autoexpandible")).toBe(true);
    expect(contenido.getAttribute("aria-describedby")).toBe("ayuda-texto-noticia");
    expect(paginaActual.getByText("Resumen y contenido se amplían automáticamente mientras escribes.")).toBeTruthy();

    Object.defineProperty(contenido, "scrollHeight", { configurable: true, value: 640 });
    fireEvent.change(contenido, { target: { value: "Párrafo de noticia\n\n".repeat(20) } });

    await waitFor(() => expect(contenido.style.height).toBe("640px"));
  });

  it("exige una portada y permite agregar varias fotos de galería antes de guardar", async () => {
    const guardada = {
      idPublicacion: 7,
      idCategoriaPublicacion: 1,
      titulo: "Noticia con portada",
      resumen: "Resumen de prueba",
      contenido: "Contenido de prueba",
      fechaEditorial: null,
      estado: "BORRADOR",
      version: 0,
    };
    apiAdministracion.crearPublicacion.mockResolvedValue(guardada);
    apiAdministracion.agregarImagenPublicacion
      .mockResolvedValueOnce({ idImagenPublicacion: 31 })
      .mockResolvedValue({ idImagenPublicacion: 32 });
    apiAdministracion.establecerPortadaPublicacion.mockResolvedValue([]);
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva noticia" }));
    fireEvent.change(paginaActual.getByLabelText("Título"), { target: { value: guardada.titulo } });
    fireEvent.change(paginaActual.getByLabelText("Resumen"), { target: { value: guardada.resumen } });
    fireEvent.change(paginaActual.getByLabelText("Contenido"), { target: { value: guardada.contenido } });
    const formulario = paginaActual.getByRole("button", { name: "Guardar" }).closest("form");
    fireEvent.submit(formulario);

    expect(await paginaActual.findByText("La portada de la noticia es obligatoria.")).toBeTruthy();
    expect(apiAdministracion.crearPublicacion).not.toHaveBeenCalled();

    const archivo = new window.File(["portada"], "portada.jpg", { type: "image/jpeg" });
    expect(paginaActual.getByRole("heading", { name: "Añadir foto de portada" })).toBeTruthy();
    expect(paginaActual.getByText("Seleccionar archivo")).toBeTruthy();
    expect(paginaActual.getByText(/Puedes incluir hasta 20 fotos además de la portada\./)).toBeTruthy();
    fireEvent.change(paginaActual.getByLabelText("Foto de portada"), { target: { files: [archivo] } });
    expect(paginaActual.getByText("Cambiar foto")).toBeTruthy();
    const fotoGaleriaUno = new window.File(["galeria-1"], "galeria-1.jpg", { type: "image/jpeg" });
    const fotoGaleriaDos = new window.File(["galeria-2"], "galeria-2.png", { type: "image/png" });
    fireEvent.change(paginaActual.getByLabelText("Fotos de galería"), {
      target: { files: [fotoGaleriaUno, fotoGaleriaDos] },
    });
    await paginaActual.findByRole("img", { name: "Vista previa de galeria-1.jpg" });
    expect(paginaActual.queryByText(/Texto alternativo/)).toBeNull();
    fireEvent.submit(formulario);

    await waitFor(() => expect(apiAdministracion.crearPublicacion).toHaveBeenCalledOnce());
    await waitFor(() => expect(apiAdministracion.agregarImagenPublicacion)
      .toHaveBeenNthCalledWith(1, 7, archivo));
    expect(apiAdministracion.agregarImagenPublicacion).toHaveBeenNthCalledWith(2, 7, fotoGaleriaUno);
    expect(apiAdministracion.agregarImagenPublicacion).toHaveBeenNthCalledWith(3, 7, fotoGaleriaDos);
    expect(apiAdministracion.establecerPortadaPublicacion).toHaveBeenCalledWith(7, 31);
    expect(await paginaActual.findByText("Noticia guardada como borrador.")).toBeTruthy();
  });

  it("limita la galería a veinte fotos adicionales", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);
    fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva noticia" }));
    const archivos = Array.from({ length: 21 }, (_, indice) => new window.File(
      [`foto-${indice + 1}`],
      `foto-${indice + 1}.jpg`,
      { type: "image/jpeg" },
    ));

    fireEvent.change(paginaActual.getByLabelText("Fotos de galería"), { target: { files: archivos } });

    expect(await paginaActual.findByText("Solo se agregaron 20 fotos porque la galería admite hasta 20.")).toBeTruthy();
    expect(paginaActual.getAllByRole("img", { name: /Vista previa de foto-/ })).toHaveLength(20);
    expect(paginaActual.getByText("La galería ya está completa.")).toBeTruthy();
  });

  it("impide abrir una noticia nueva cuando no existen categorías activas", async () => {
    apiAdministracion.listarCategoriasAdministradas.mockResolvedValue([]);
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    const botonNuevo = await paginaActual.findByRole("button", { name: "Nueva noticia" });
    expect(botonNuevo.disabled).toBe(true);
    expect(paginaActual.getByText(/Primero crea al menos una categoría activa/)).toBeTruthy();
    fireEvent.click(botonNuevo);

    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
    expect(apiAdministracion.crearPublicacion).not.toHaveBeenCalled();
  });

  it("intercambia los paneles de categoría, noticia y listado", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    await waitFor(() => expect(paginaActual.getByRole("button", { name: "Nueva noticia" }).disabled).toBe(false));
    fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva categoría" }));
    await waitFor(() => expect(paginaActual.getByLabelText("Orden de categorías")).toBeTruthy());
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva noticia" }));
    expect(paginaActual.queryByLabelText("Orden de categorías")).toBeNull();
    await waitFor(() => expect(vista.container.querySelector("#tituloPublicacion")).toBeTruthy());
    fireEvent.click(paginaActual.getByRole("button", { name: "Nueva categoría" }));
    expect(vista.container.querySelector("#tituloPublicacion")).toBeNull();
    expect(paginaActual.getByLabelText("Orden de categorías")).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Listado de noticias" }));
    expect(vista.container.querySelector("#codigoCategoria")).toBeNull();
    expect(paginaActual.getByRole("heading", { name: "Listado de noticias" })).toBeTruthy();
    fireEvent.click(paginaActual.getByRole("button", { name: "Listado de noticias" }));
    expect(paginaActual.getByRole("heading", { name: "Listado de noticias" })).toBeTruthy();
  });

  it("oculta el código e impide repetir el orden de otra categoría", async () => {
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);

    fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva categoría" }));
    expect(paginaActual.queryByLabelText("Código")).toBeNull();
    fireEvent.change(paginaActual.getByLabelText("Nombre"), { target: { value: "Actividades" } });
    fireEvent.change(paginaActual.getByLabelText("Orden de categorías"), { target: { value: "1" } });

    expect(paginaActual.getByRole("button", { name: "Guardar categoría" }).disabled).toBe(true);
    expect(apiAdministracion.crearCategoria).not.toHaveBeenCalled();

    fireEvent.change(paginaActual.getByLabelText("Orden de categorías"), { target: { value: "10" } });
    fireEvent.click(paginaActual.getByRole("button", { name: "Guardar categoría" }));

    await waitFor(() => expect(apiAdministracion.crearCategoria).toHaveBeenCalledWith({
      nombre: "Actividades",
      descripcion: "",
      ordenVisualizacion: 10,
      activa: true,
      version: null,
    }));
    expect(apiAdministracion.crearCategoria.mock.calls[0][0]).not.toHaveProperty("codigo");
  });

  it("confirma y elimina una categoría que no tiene publicaciones", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
      const paginaActual = within(vista.container);
      fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva categoría" }));
      const categoria = await paginaActual.findByRole("button", { name: /1Noticias/ });
      fireEvent.click(categoria);
      apiAdministracion.listarCategoriasAdministradas.mockResolvedValueOnce([]);

      const eliminar = paginaActual.getByRole("button", { name: "Eliminar" });
      fireEvent.click(eliminar);

      expect(confirmar).toHaveBeenCalledOnce();
      await waitFor(() => expect(apiAdministracion.eliminarCategoria).toHaveBeenCalledWith(1, 0));
      expect(await paginaActual.findByText("Categoría eliminada.")).toBeTruthy();
    } finally {
      confirmar.mockRestore();
    }
  });

  it("mantiene los errores dentro del contenido sin desplazar el menú lateral", async () => {
    apiAdministracion.eliminarCategoria.mockRejectedValueOnce(
      new Error("No se puede eliminar la categoría porque tiene publicaciones asociadas."),
    );
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
      const paginaActual = within(vista.container);
      fireEvent.click(await paginaActual.findByRole("button", { name: "Nueva categoría" }));
      fireEvent.click(await paginaActual.findByRole("button", { name: /1Noticias/ }));
      fireEvent.click(paginaActual.getByRole("button", { name: "Eliminar" }));

      const alerta = await paginaActual.findByRole("alert");
      expect(alerta.parentElement.classList.contains("contenido-modulo-administracion")).toBe(true);
      expect(vista.container.querySelector("main > .mensaje-error")).toBeNull();

      fireEvent.click(paginaActual.getByRole("heading", { name: "Noticias", level: 1 }));
      await waitFor(() => expect(paginaActual.queryByRole("alert")).toBeNull());
    } finally {
      confirmar.mockRestore();
    }
  });

  it("muestra una vista previa del archivo seleccionado antes de cargarlo", async () => {
    apiAdministracion.listarImagenesPublicacion.mockResolvedValue([{
      idImagenPublicacion: 31,
      nombreArchivoOriginal: "imagen-guardada.png",
      tipoMedio: "image/png",
      tamanoBytes: 1024,
      anchoPixeles: 640,
      altoPixeles: 480,
      textoAlternativo: "Imagen guardada del parque",
      ordenVisualizacion: 0,
    }]);
    apiAdministracion.listarPublicacionesAdministradas.mockResolvedValue({
      contenido: [{
        idPublicacion: 7,
        idCategoriaPublicacion: 1,
        nombreCategoria: "Noticias",
        titulo: "Noticia de prueba",
        identificadorUrl: "noticia-de-prueba",
        resumen: "Resumen",
        contenido: "Contenido",
        estado: "BORRADOR",
        fechaEditorial: null,
        version: 1,
      }],
      pagina: 0,
      totalPaginas: 1,
      totalElementos: 1,
    });
    const vista = render(<MemoryRouter><PaginaAdministracionPublicaciones /></MemoryRouter>);
    const paginaActual = within(vista.container);
    fireEvent.click(await paginaActual.findByRole("button", { name: "Listado de noticias" }));
    const botonConsultar = await paginaActual.findByRole("button", { name: "Consultar" });
    fireEvent.click(botonConsultar);

    expect(paginaActual.getByRole("heading", { name: "Listado de noticias" })).toBeTruthy();
    expect(botonConsultar.getAttribute("aria-expanded")).toBe("true");
    expect(paginaActual.getByRole("heading", { name: "Editar noticia" })).toBeTruthy();

    const miniatura = await paginaActual.findByRole("img", { name: "Imagen guardada del parque" });
    expect(miniatura.getAttribute("src")).toBe("/api/v1/administracion/publicaciones/7/imagenes/31/archivo");

    const archivo = new window.File(["imagen"], "parque.png", { type: "image/png" });
    fireEvent.change(paginaActual.getByLabelText("Fotos de galería"), { target: { files: [archivo] } });

    const vistaPrevia = await paginaActual.findByRole("img", { name: "Vista previa de parque.png" });
    expect(vistaPrevia.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
    expect(paginaActual.getByText("parque.png")).toBeTruthy();
    expect(apiAdministracion.agregarImagenPublicacion).not.toHaveBeenCalled();
  });

  it("permite desarchivar una noticia archivada", async () => {
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
    fireEvent.click(await paginaActual.findByRole("button", { name: "Listado de noticias" }));
    fireEvent.click(await paginaActual.findByRole("button", { name: "Consultar" }));
    expect(paginaActual.queryByRole("button", { name: "Previsualizar" })).toBeNull();
    fireEvent.click(paginaActual.getByRole("button", { name: "Desarchivar" }));

    expect(apiAdministracion.desarchivarPublicacion).toHaveBeenCalledWith(9, 4);
    expect(await paginaActual.findByRole("button", { name: "Publicar" })).toBeTruthy();
  });

  it("confirma y elimina una noticia con su versión vigente", async () => {
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
      fireEvent.click(await paginaActual.findByRole("button", { name: "Listado de noticias" }));
      fireEvent.click(await paginaActual.findByRole("button", { name: "Consultar" }));

      expect(paginaActual.queryByRole("button", { name: "Despublicar" })).toBeNull();
      const archivar = paginaActual.getByRole("button", { name: "Archivar" });
      const eliminar = paginaActual.getByRole("button", { name: "Eliminar noticia" });
      expect(archivar.parentElement).toBe(eliminar.parentElement);
      fireEvent.click(eliminar);

      expect(confirmar).toHaveBeenCalledOnce();
      expect(apiAdministracion.eliminarPublicacion).toHaveBeenCalledWith(12, 6);
    } finally {
      confirmar.mockRestore();
    }
  });
});
