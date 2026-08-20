import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  confirmarCorreo: vi.fn(),
  reenviarVerificacion: vi.fn(),
}));

vi.mock("../api/autenticacion", () => api);

import { PaginaVerificacionCorreo } from "./PaginaVerificacionCorreo";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Verificación de correo", () => {
  it("confirma automáticamente el token recibido en el enlace", async () => {
    api.confirmarCorreo.mockResolvedValue({ mensaje: "Confirmado, ya puedes iniciar sesión." });
    render(<MemoryRouter initialEntries={["/verificar-correo?token=token-seguro"]}><PaginaVerificacionCorreo /></MemoryRouter>);

    expect(screen.getByRole("status").textContent).toContain("Verificando");
    await waitFor(() => expect(api.confirmarCorreo).toHaveBeenCalledWith("token-seguro"));
    expect(await screen.findByRole("heading", { name: "Correo verificado" })).toBeTruthy();
    expect(await screen.findByText("Confirmado, ya puedes iniciar sesión.")).toBeTruthy();
    expect(screen.queryByText("Seguridad de la cuenta")).toBeNull();
    expect(screen.queryByText("Confirma tu dirección de correo para habilitar el acceso a tu cuenta.")).toBeNull();
    expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toBeTruthy();
  });

  it("permite solicitar otro enlace cuando no hay token", async () => {
    api.reenviarVerificacion.mockResolvedValue({ mensaje: "Si la cuenta está pendiente, enviamos un nuevo enlace de verificación." });
    render(<MemoryRouter initialEntries={["/verificar-correo"]}><PaginaVerificacionCorreo /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: " persona@ejemplo.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar nuevo enlace" }));

    await waitFor(() => expect(api.reenviarVerificacion).toHaveBeenCalledWith("persona@ejemplo.com"));
    expect(await screen.findByText(/Si la cuenta está pendiente/)).toBeTruthy();
  });
});
