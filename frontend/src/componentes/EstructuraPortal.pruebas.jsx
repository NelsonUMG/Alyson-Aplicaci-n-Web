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

  it("muestra la información de visita vigente sin textos de marcador", () => {
    render(<MemoryRouter><EstructuraPortal /></MemoryRouter>);

    expect(screen.getByText("28 avenida 14-02 zona 7 ciudad del plata II, Ciudad de Guatemala.")).toBeTruthy();
    expect(screen.getByText("Lunes a domingo · 5 a. m. – 5 p. m.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "2474 6608" }).getAttribute("href")).toBe("tel:+50224746608");
    expect(screen.queryByText("Información y actividades del Parque Erick Barrondo.")).toBeNull();
    expect(screen.queryByText("Proyecto")).toBeNull();
    expect(screen.queryByText("Dirección de Polideportivo.")).toBeNull();
    expect(screen.queryByText("Horario y contacto pendientes de validación.")).toBeNull();
  });
});
