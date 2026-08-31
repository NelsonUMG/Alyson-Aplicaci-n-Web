import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({ usuario: null, cerrar: vi.fn(), actualizarUsuario: vi.fn() }));
const apiAutenticacion = vi.hoisted(() => ({
  actualizarPerfil: vi.fn(),
  cambiarContrasena: vi.fn(),
  eliminarFotoPerfil: vi.fn(),
  obtenerPerfil: vi.fn(),
  subirFotoPerfil: vi.fn(),
}));

const usuarioAdministrador = {
    nombre: "Administrador",
    apellido: "Revisión",
    correo: "administrador@parque.local",
    roles: ["ADMINISTRADOR", "USUARIOREGISTRADO"],
    permisos: ["ROLGESTIONAR", "PUBLICACIONLEER", "EVENTOLEER", "AREALEER", "BICICLETALEER", "INSTITUCIONALGESTIONAR", "REPORTELEER"],
};

vi.mock("../api/autenticacion", () => apiAutenticacion);
vi.mock("../autenticacion/ContextoSesion", () => ({ usarSesion: () => sesion }));

import { PaginaPerfil } from "./PaginaPerfil";

describe("Perfil", () => {
  afterEach(cleanup);

  beforeEach(() => {
    sesion.usuario = usuarioAdministrador;
    sesion.cerrar.mockReset();
    sesion.actualizarUsuario.mockReset();
    apiAutenticacion.obtenerPerfil.mockReset();
  });

  it("muestra los módulos administrativos autorizados con sus accesos", () => {
    render(<MemoryRouter><PaginaPerfil /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Administrador" })).toBeTruthy();
    expect(screen.queryByText("Roles asignados")).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis inscripciones" })).toBeNull();
    expect(screen.queryByText("Cambiar contraseña")).toBeNull();
    expect(screen.queryByText("USUARIOREGISTRADO")).toBeNull();
    expect(screen.getByRole("heading", { name: "Visualización de módulos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Usuarios y roles" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Eventos y cursos" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Inventario de bicicletas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Contenido institucional" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reportes de inscripciones" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Auditoría del sistema" })).toBeTruthy();
  });

  it("presenta los datos editables y omite naturaleza y autenticación de dos factores", async () => {
    sesion.usuario = {
      idUsuario: 7,
      nombre: "Usuario",
      apellido: "Común",
      correo: "usuario@ejemplo.com",
      roles: ["USUARIOREGISTRADO"],
      permisos: ["PUBLICACIONLEER", "EVENTOLEER", "AREALEER", "BICICLETALEER"],
      dpi: "1234567890101",
      dpiExtendidoEn: "Guatemala, Guatemala",
      fechaNacimiento: "1995-04-10",
      celular: "55551234",
      telefono: "",
      direccion: "",
      urlFotoPerfil: null,
    };
    apiAutenticacion.obtenerPerfil.mockResolvedValue(sesion.usuario);

    render(<MemoryRouter><PaginaPerfil /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Usuario Común" })).toBeTruthy();
    expect(screen.queryByText("Roles asignados")).toBeNull();
    expect(screen.queryByText("Visualización de módulos")).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis inscripciones" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis solicitudes" })).toBeNull();
    expect(screen.getByLabelText("Nombres *").value).toBe("Usuario");
    expect(screen.getByLabelText("DPI · CUI *").readOnly).toBe(true);
    expect(screen.getByLabelText("Correo electrónico").readOnly).toBe(true);
    expect(screen.getByLabelText("Dirección Opcional")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Actualizar datos" })).toBeTruthy();
    expect(screen.getByText(/PNG o JPEG/)).toBeTruthy();
    expect(screen.queryByText("Naturaleza")).toBeNull();
    expect(screen.queryByText(/Autenticación en dos factores/i)).toBeNull();
    expect(screen.getByRole("heading", { name: "Cambiar contraseña" })).toBeTruthy();
    await waitFor(() => expect(apiAutenticacion.obtenerPerfil).toHaveBeenCalled());
  });
});
