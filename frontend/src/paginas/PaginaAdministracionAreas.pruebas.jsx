import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiAreas = vi.hoisted(() => ({
  actualizarArea: vi.fn(),
  actualizarCategoriaArea: vi.fn(),
  agregarImagenArea: vi.fn(),
  crearArea: vi.fn(),
  crearCategoriaArea: vi.fn(),
  eliminarArea: vi.fn(),
  eliminarImagenArea: vi.fn(),
  listarAreasAdministradas: vi.fn(),
  listarCategoriasArea: vi.fn(),
}));

vi.mock("../api/administracionAreas", () => apiAreas);
vi.mock("../componentes/EditorPerimetroArea", () => ({
  EditorPerimetroArea: () => <div aria-label="Mapa para dibujar el perímetro del área" />,
}));
vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => ({ usuario: { permisos: ["AREALEER", "AREAACTUALIZARESTADO", "AREAELIMINAR"] } }),
}));

import { PaginaAdministracionAreas } from "./PaginaAdministracionAreas";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    apiAreas.crearArea.mockReset();
    apiAreas.agregarImagenArea.mockReset();
    apiAreas.eliminarArea.mockReset();
    apiAreas.eliminarImagenArea.mockReset();
  });

  it("carga el inventario y abre el formulario completo de una nueva área", async () => {
    render(<MemoryRouter><PaginaAdministracionAreas /></MemoryRouter>);

    await screen.findByRole("button", { name: "Categorías" });
    fireEvent.click(screen.getByRole("button", { name: "Categorías" }));
    const selectorCategoria = screen.getByLabelText("Seleccionar categoría existente");
    expect(within(selectorCategoria).getByRole("option", { name: "Deporte" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Nueva área" }));

    expect(screen.queryByRole("heading", { name: "Categorías de áreas" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Registrar área" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar Área" })).toBeTruthy();
    expect(screen.getByLabelText("Coordenadas confirmadas")).toBeTruthy();
    expect(screen.getByLabelText("Observaciones internas")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Horario del área" })).toBeTruthy();
    expect(screen.getByLabelText("Hora de apertura")).toBeTruthy();
    expect(screen.queryByText("Horario en JSON")).toBeNull();
    expect(screen.getByLabelText("Mapa para dibujar el perímetro del área")).toBeTruthy();
    expect(screen.getByLabelText("Perímetro confirmado para mostrar en el mapa público").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Guardar área" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Grafo de recorridos confirmados" })).toBeNull();
  });

  it("impide registrar un área cuando no existen categorías activas", async () => {
    apiAreas.listarCategoriasArea.mockResolvedValue([]);
    render(<MemoryRouter><PaginaAdministracionAreas /></MemoryRouter>);

    const botonNuevaArea = await screen.findByRole("button", { name: "Nueva área" });
    expect(botonNuevaArea.disabled).toBe(true);
    expect(screen.getByText(/Primero crea al menos una categoría activa/)).toBeTruthy();
    fireEvent.click(botonNuevaArea);
    expect(screen.queryByRole("heading", { name: "Registrar área" })).toBeNull();
  });

  it("convierte los días y horas seleccionados al JSON válido de la API", async () => {
    const horarioJson = JSON.stringify({
      periodos: [{ dias: ["LUNES", "MARTES"], abre: "08:00", cierra: "17:00" }],
    });
    apiAreas.crearArea.mockResolvedValue({
      idArea: 9,
      idCategoriaArea: 1,
      codigo: "CAMPO1",
      numeroVisibleMapa: null,
      nombre: "Campo 1",
      descripcion: null,
      estado: "PENDIENTECONFIRMACION",
      notaDisponibilidad: null,
      latitud: null,
      longitud: null,
      coordenadasConfirmadas: false,
      perimetro: [],
      perimetroConfirmado: false,
      horarioJson,
      observacionesInternas: null,
      motivoCambioEstado: null,
      version: 0,
    });
    render(<MemoryRouter><PaginaAdministracionAreas /></MemoryRouter>);
    await screen.findByRole("button", { name: "Categorías" });
    fireEvent.click(screen.getByRole("button", { name: "Categorías" }));
    screen.getByLabelText("Seleccionar categoría existente");
    fireEvent.click(screen.getByRole("button", { name: "Nueva área" }));
    const formulario = within(screen.getByRole("region", { name: "Registrar área" }));
    fireEvent.change(formulario.getByLabelText("Categoría"), { target: { value: "1" } });
    fireEvent.change(formulario.getByLabelText("Código"), { target: { value: "CAMPO1" } });
    fireEvent.change(formulario.getByLabelText("Nombre"), { target: { value: "Campo 1" } });
    fireEvent.change(formulario.getByLabelText("Motivo del estado"), { target: { value: "Registro inicial" } });
    fireEvent.click(formulario.getByLabelText("Lunes"));
    fireEvent.click(formulario.getByLabelText("Martes"));
    fireEvent.change(formulario.getByLabelText("Hora de apertura"), { target: { value: "08:00" } });
    fireEvent.change(formulario.getByLabelText("Hora de cierre"), { target: { value: "17:00" } });
    fireEvent.click(formulario.getByRole("button", { name: "Agregar horario" }));
    fireEvent.click(formulario.getByRole("button", { name: "Guardar área" }));

    await waitFor(() => expect(apiAreas.crearArea).toHaveBeenCalledWith(expect.objectContaining({
      horarioJson,
    })));
    expect(await screen.findByText("Área guardada.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Imagen del área" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Disponibilidad con reloj" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Historial de estados" })).toBeNull();
  });

  it("elimina definitivamente un área seleccionada después de confirmarla", async () => {
    const area = {
      idArea: 9,
      idCategoriaArea: 1,
      nombreCategoria: "Deporte",
      codigo: "CAMPO2",
      numeroVisibleMapa: 2,
      nombre: "Campo 2",
      descripcion: null,
      estado: "DISPONIBLE",
      notaDisponibilidad: null,
      latitud: 14.602,
      longitud: -90.552,
      coordenadasConfirmadas: true,
      perimetro: [],
      perimetroConfirmado: false,
      horarioJson: null,
      observacionesInternas: null,
      version: 4,
    };
    apiAreas.listarAreasAdministradas
      .mockReset()
      .mockResolvedValueOnce({ contenido: [area], pagina: 0, totalPaginas: 1, totalElementos: 1 })
      .mockResolvedValue({ contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0 });
    apiAreas.eliminarArea.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemoryRouter><PaginaAdministracionAreas /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Campo 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar área" }));

    await waitFor(() => expect(apiAreas.eliminarArea).toHaveBeenCalledWith(9, 4));
    expect(await screen.findByText("Área eliminada.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Actualizar área" })).toBeNull();
  });

  it("permite cargar una imagen cuando el área ya está guardada", async () => {
    const area = {
      idArea: 9,
      idCategoriaArea: 1,
      nombreCategoria: "Deporte",
      codigo: "CAMPO2",
      numeroVisibleMapa: 2,
      nombre: "Campo 2",
      descripcion: null,
      estado: "DISPONIBLE",
      notaDisponibilidad: null,
      latitud: 14.602,
      longitud: -90.552,
      coordenadasConfirmadas: true,
      perimetro: [],
      perimetroConfirmado: false,
      horarioJson: null,
      observacionesInternas: null,
      tieneImagen: false,
      urlImagen: null,
      version: 4,
    };
    apiAreas.listarAreasAdministradas.mockReset().mockResolvedValue({
      contenido: [area], pagina: 0, totalPaginas: 1, totalElementos: 1,
    });
    apiAreas.agregarImagenArea.mockResolvedValue({
      ...area,
      tieneImagen: true,
      urlImagen: "/api/v1/administracion/areas/9/imagen",
      version: 5,
    });
    render(<MemoryRouter><PaginaAdministracionAreas /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Campo 2/ }));
    const archivo = new window.File(["imagen"], "campo.jpg", { type: "image/jpeg" });
    const campoArchivo = screen.getByLabelText("Archivo PNG o JPEG");
    fireEvent.change(campoArchivo, { target: { files: [archivo] } });
    fireEvent.submit(campoArchivo.closest("form"));

    await waitFor(() => expect(apiAreas.agregarImagenArea).toHaveBeenCalledWith(9, archivo));
    expect(await screen.findByText("Imagen del área actualizada.")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Campo 2" })).toBeTruthy();
  });
});
