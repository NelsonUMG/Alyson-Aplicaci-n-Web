import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PaginaAdministracionPortada } from "./PaginaAdministracionPortada";

const api = vi.hoisted(() => ({ consultarPortada: vi.fn(), guardarPortada: vi.fn() }));
const actualizar = vi.hoisted(() => vi.fn());
vi.mock("../api/configuracionPortada", () => api);
vi.mock("../componentes/ContextoPortada", () => ({ usarPortada: () => ({ actualizarConfiguracion: actualizar }), textoSobreColor: () => "#ffffff" }));
const inicial = { colorPrincipal: "#0b4536", portadaUrl: null, version: 3 };
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.consultarPortada.mockResolvedValue(inicial);
  api.guardarPortada.mockResolvedValue({ ...inicial, colorPrincipal: "#334488", version: 4 });
});

describe("Configuración de la página principal", () => {
  it("previsualiza sin guardar y publica solo al confirmar", async () => {
    render(<MemoryRouter><PaginaAdministracionPortada /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Color principal"), { target: { value: "#334488" } });
    expect(api.guardarPortada).not.toHaveBeenCalled();
    expect(screen.getByText("#334488")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Página principal actualizada.")).toBeTruthy();
    expect(api.guardarPortada).toHaveBeenCalledWith({ colorPrincipal: "#334488", version: 3, quitarPortada: false }, null);
    expect(actualizar).toHaveBeenCalledWith({ ...inicial, colorPrincipal: "#334488", version: 4 });
  });
  it("conserva el color seleccionado cuando el guardado falla", async () => {
    api.guardarPortada.mockRejectedValue(new Error("Recarga la configuración antes de guardar."));
    render(<MemoryRouter><PaginaAdministracionPortada /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Color principal"), { target: { value: "#334488" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Color principal").value).toBe("#334488");
    expect(actualizar).not.toHaveBeenCalled();
  });
  it("rechaza un archivo que no es imagen sin alterar la portada guardada", async () => {
    render(<MemoryRouter><PaginaAdministracionPortada /></MemoryRouter>);
    const control = await screen.findByLabelText("Imagen de portada");
    fireEvent.change(control, { target: { files: [new window.File(["texto"], "prueba.txt", { type: "text/plain" })] } });
    expect(await screen.findByText("Selecciona una imagen JPG o PNG de hasta 5 MB.")).toBeTruthy();
    expect(api.guardarPortada).not.toHaveBeenCalled();
  });
  it("descarta los cambios y recupera la configuración publicada", async () => {
    render(<MemoryRouter><PaginaAdministracionPortada /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Color principal"), { target: { value: "#334488" } });
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios / recargar" }));
    await waitFor(() => expect(screen.getByLabelText("Color principal").value).toBe(inicial.colorPrincipal));
  });
});
