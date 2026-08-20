import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({ usuario: null, cerrar: vi.fn() }));

const usuarioAdministrador = {
    nombre: "Administrador",
    apellido: "Revisión",
    correo: "administrador@parque.local",
    roles: ["ADMINISTRADOR", "USUARIOREGISTRADO"],
    permisos: ["ROLGESTIONAR", "PUBLICACIONLEER", "EVENTOLEER", "AREALEER", "BICICLETALEER", "INSTITUCIONALGESTIONAR", "REPORTELEER"],
};

vi.mock("../api/autenticacion", () => ({ cambiarContrasena: vi.fn() }));
vi.mock("../autenticacion/ContextoSesion", () => ({ usarSesion: () => sesion }));

import { PaginaPerfil } from "./PaginaPerfil";

describe("Perfil", () => {
  afterEach(cleanup);

  beforeEach(() => {
    sesion.usuario = usuarioAdministrador;
    sesion.cerrar.mockReset();
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

  it("oculta roles y módulos administrativos al usuario común", () => {
    sesion.usuario = {
      nombre: "Usuario",
      apellido: "Común",
      correo: "usuario@ejemplo.com",
      roles: ["USUARIOREGISTRADO"],
      permisos: ["PUBLICACIONLEER", "EVENTOLEER", "AREALEER", "BICICLETALEER"],
    };

    render(<MemoryRouter><PaginaPerfil /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Usuario Común" })).toBeTruthy();
    expect(screen.queryByText("Roles asignados")).toBeNull();
    expect(screen.queryByText("Visualización de módulos")).toBeNull();
    expect(screen.queryByRole("link", { name: "Noticias" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Eventos y cursos" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Áreas, instalaciones y mapa" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis inscripciones" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis solicitudes" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Cambiar contraseña" })).toBeTruthy();
  });
});
