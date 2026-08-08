import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({
  usuario: {
    nombre: "Administrador",
    apellido: "Revisión",
    correo: "administrador@parque.local",
    roles: ["ADMINISTRADOR", "USUARIOREGISTRADO"],
    permisos: ["ROLGESTIONAR", "PUBLICACIONLEER", "EVENTOLEER", "AREALEER", "BICICLETALEER", "INSTITUCIONALGESTIONAR", "REPORTELEER"],
  },
  cerrar: vi.fn(),
}));

vi.mock("../api/autenticacion", () => ({ cambiarContrasena: vi.fn() }));
vi.mock("../autenticacion/ContextoSesion", () => ({ usarSesion: () => sesion }));

import { PaginaPerfil } from "./PaginaPerfil";

describe("Perfil", () => {
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
    expect(screen.getByRole("link", { name: "Contenido institucional" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Auditoría del sistema" })).toBeTruthy();
  });
});
