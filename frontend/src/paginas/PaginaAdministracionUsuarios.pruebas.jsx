import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiUsuarios = vi.hoisted(() => ({
  actualizarRolesUsuario: vi.fn(),
  crearEmpleado: vi.fn(),
  crearRol: vi.fn(),
  listarPermisos: vi.fn(),
  listarRoles: vi.fn(),
  listarUsuarios: vi.fn(),
}));

vi.mock("../api/administracionUsuarios", () => apiUsuarios);

import { PaginaAdministracionUsuarios } from "./PaginaAdministracionUsuarios";

describe("Administración de usuarios", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiUsuarios.listarUsuarios.mockReset().mockResolvedValue({ contenido: [], pagina: 0, totalPaginas: 0 });
    apiUsuarios.listarRoles.mockReset().mockResolvedValue([
      { codigo: "USUARIOREGISTRADO", nombre: "Usuario registrado", descripcion: "Persona con cuenta activa." },
      { codigo: "OPERADOREVENTOS", nombre: "Operador de eventos", descripcion: "Gestiona eventos." },
    ]);
    apiUsuarios.listarPermisos.mockReset().mockResolvedValue([
      { codigo: "EVENTOLEER", descripcion: "Consultar eventos." },
    ]);
  });

  it("permite abrir el registro de empleados y seleccionar sus roles operativos", async () => {
    render(<MemoryRouter><PaginaAdministracionUsuarios /></MemoryRouter>);

    expect(await screen.findByText("No se encontraron usuarios.")).toBeTruthy();
    const acciones = screen.getByLabelText("Administración de empleados y roles");
    expect(within(acciones).getAllByRole("button").map((boton) => boton.textContent)).toEqual([
      "Crear Roles",
      "Registrar empleado",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Registrar empleado" }));

    expect(screen.getByRole("button", { name: "Ocultar Empleado" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Registrar empleado" })).toBeTruthy();
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
    expect(screen.getByText("El rol USUARIOREGISTRADO se asigna automáticamente.")).toBeTruthy();
    expect(screen.getByLabelText(/Operador de eventos/)).toBeTruthy();
  });

  it("muestra los permisos al crear un rol para empleados", async () => {
    render(<MemoryRouter><PaginaAdministracionUsuarios /></MemoryRouter>);

    await screen.findByText("No se encontraron usuarios.");
    fireEvent.click(screen.getByRole("button", { name: "Crear Roles" }));

    expect(screen.getByRole("button", { name: "Ocultar Roles" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Crear rol para empleados" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Eventos e inscripciones" })).toBeTruthy();
    expect(screen.getByLabelText(/EVENTO LEER/)).toBeTruthy();
  });

  it("impide abrir el registro de empleados cuando no hay roles asignables", async () => {
    apiUsuarios.listarRoles.mockResolvedValue([
      { codigo: "USUARIOREGISTRADO", nombre: "Usuario registrado", descripcion: "Persona con cuenta activa." },
    ]);
    render(<MemoryRouter><PaginaAdministracionUsuarios /></MemoryRouter>);

    await screen.findByText("No se encontraron usuarios.");
    const botonRegistro = screen.getByRole("button", { name: "Registrar empleado" });
    expect(botonRegistro.disabled).toBe(true);
    expect(screen.getByText(/Primero crea al menos un rol asignable/)).toBeTruthy();
    fireEvent.click(botonRegistro);
    expect(screen.queryByRole("heading", { name: "Registrar empleado" })).toBeNull();
  });

  it("no permite completar un empleado sin seleccionar un rol", async () => {
    render(<MemoryRouter><PaginaAdministracionUsuarios /></MemoryRouter>);

    await screen.findByText("No se encontraron usuarios.");
    fireEvent.click(screen.getByRole("button", { name: "Registrar empleado" }));

    const panelRegistro = screen.getByRole("heading", { name: "Registrar empleado" }).closest("section");
    expect(within(panelRegistro).getByRole("button", { name: "Registrar empleado" }).disabled).toBe(true);
    expect(apiUsuarios.crearEmpleado).not.toHaveBeenCalled();
  });
});
