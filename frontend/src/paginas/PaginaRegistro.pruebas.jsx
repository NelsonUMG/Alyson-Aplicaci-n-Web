import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const registrarCuenta = vi.hoisted(() => vi.fn());

vi.mock("../api/autenticacion", () => ({ registrarCuenta }));

import { PaginaRegistro } from "./PaginaRegistro";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Registro de usuario", () => {
  it("registra los datos personales y las credenciales en dos etapas", async () => {
    registrarCuenta.mockResolvedValue({ mensaje: "Cuenta creada. Revisa tu correo para confirmar la dirección y habilitar el acceso." });
    render(<MemoryRouter><PaginaRegistro /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Datos personales" })).toBeTruthy();
    expect(screen.queryByLabelText("Correo electrónico")).toBeNull();

    fireEvent.change(screen.getByLabelText("Número de DPI/CUI"), { target: { value: "1234567890101" } });
    fireEvent.change(screen.getByLabelText("Nombres"), { target: { value: "  Persona  " } });
    fireEvent.change(screen.getByLabelText("Apellidos"), { target: { value: "  Prueba  " } });
    fireEvent.change(screen.getByLabelText("Celular"), { target: { value: "55551234" } });
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento"), { target: { value: "1995-04-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar →" }));

    expect(screen.getByRole("heading", { name: "Datos de acceso" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "  persona@ejemplo.com  " } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Contrasena larga de prueba" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Contrasena larga de prueba" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(registrarCuenta).toHaveBeenCalledWith({
      dpi: "1234567890101",
      nombre: "Persona",
      apellido: "Prueba",
      celular: "55551234",
      fechaNacimiento: "1995-04-10",
      correo: "persona@ejemplo.com",
      contrasena: "Contrasena larga de prueba",
      confirmarContrasena: "Contrasena larga de prueba",
    }));
    expect(await screen.findByRole("heading", { name: "Confirma tu correo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "¿Necesitas otro enlace?" })).toBeTruthy();
  });

  it("impide enviar contraseñas que no coinciden", () => {
    render(<MemoryRouter><PaginaRegistro /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Número de DPI/CUI"), { target: { value: "1234567890101" } });
    fireEvent.change(screen.getByLabelText("Nombres"), { target: { value: "Persona" } });
    fireEvent.change(screen.getByLabelText("Apellidos"), { target: { value: "Prueba" } });
    fireEvent.change(screen.getByLabelText("Celular"), { target: { value: "55551234" } });
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento"), { target: { value: "1995-04-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar →" }));
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "persona@ejemplo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Contrasena larga de prueba" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Otra contrasena segura" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert").textContent).toContain("no coinciden");
    expect(registrarCuenta).not.toHaveBeenCalled();
  });
});
