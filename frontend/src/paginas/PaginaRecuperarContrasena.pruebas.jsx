import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ solicitarRecuperacion: vi.fn(), restablecerContrasena: vi.fn() }));
vi.mock("../api/autenticacion", () => api);
import { PaginaRecuperarContrasena } from "./PaginaRecuperarContrasena";

afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); });
function mostrar(token = "") {
  return render(<MemoryRouter initialEntries={[`/recuperar-contrasena${token ? `?token=${token}` : ""}`]}><PaginaRecuperarContrasena /></MemoryRouter>);
}
describe("Recuperación de contraseña", () => {
  it("solicita el enlace por correo y explica que vence en una hora", async () => {
    api.solicitarRecuperacion.mockResolvedValue({ mensaje: "Si la cuenta está verificada recibirás un enlace." });
    mostrar();
    expect(screen.getByText(/El enlace vence en 1 hora/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "persona@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace de recuperación" }));
    await waitFor(() => expect(api.solicitarRecuperacion).toHaveBeenCalledWith("persona@example.com"));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(api.restablecerContrasena).not.toHaveBeenCalled();
  });
  it("requiere confirmar la contraseña y permite corregirla", async () => {
    api.restablecerContrasena.mockResolvedValue({ mensaje: "Contraseña actualizada." });
    mostrar("token-prueba");
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Contraseña segura nueva" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Otra contraseña nueva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(screen.getByRole("alert").textContent).toContain("no coinciden");
    expect(api.restablecerContrasena).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Contraseña segura nueva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() => expect(api.restablecerContrasena).toHaveBeenCalledWith({ token: "token-prueba", contrasenaNueva: "Contraseña segura nueva", confirmarContrasena: "Contraseña segura nueva" }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guardar contraseña" })).toBeNull();
  });
  it("muestra el error de enlace vencido y permite solicitar otro", async () => {
    api.restablecerContrasena.mockRejectedValue(new Error("El enlace venció. Solicita uno nuevo."));
    mostrar("vencido");
    for (const label of ["Nueva contraseña", "Confirmar contraseña"]) fireEvent.change(screen.getByLabelText(label), { target: { value: "Contraseña segura nueva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect((await screen.findByRole("alert")).textContent).toContain("venció");
    fireEvent.click(screen.getByRole("link", { name: "Solicitar un enlace nuevo" }));
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
  });
});
