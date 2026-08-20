import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({ cargando: false, usuario: null }));

vi.mock("../autenticacion/ContextoSesion", () => ({ usarSesion: () => sesion }));

import { EstructuraPortal } from "./EstructuraPortal";

describe("Navegación del portal", () => {
  afterEach(cleanup);

  beforeEach(() => {
    sesion.cargando = false;
    sesion.usuario = null;
  });

  it("agrega los accesos personales cuando inicia sesión un usuario común", () => {
    sesion.usuario = {
      nombre: "Usuario",
      roles: ["USUARIOREGISTRADO"],
      permisos: [],
    };

    render(<MemoryRouter><EstructuraPortal /></MemoryRouter>);

    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mis inscripciones" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mis solicitudes" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mi perfil" })).toBeTruthy();
  });

  it("no muestra accesos personales a visitantes", () => {
    render(<MemoryRouter><EstructuraPortal /></MemoryRouter>);

    expect(screen.queryByRole("link", { name: "Mis inscripciones" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis solicitudes" })).toBeNull();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeTruthy();
  });
});
