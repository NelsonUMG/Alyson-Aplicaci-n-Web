import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiEventos = vi.hoisted(() => ({ listarEventos: vi.fn() }));
const sesion = vi.hoisted(() => ({ usuario: null }));

vi.mock("../api/portalPublico", () => apiEventos);
vi.mock("../autenticacion/ContextoSesion", () => ({ usarSesion: () => sesion }));
vi.mock("../componentes/CabeceraPagina", () => ({ CabeceraPagina: ({ titulo }) => <h1>{titulo}</h1> }));

import { PaginaEventos } from "./PaginaEventos";

describe("Eventos públicos", () => {
  beforeEach(() => {
    apiEventos.listarEventos.mockReset().mockResolvedValue({ contenido: [], totalPaginas: 1 });
  });

  afterEach(cleanup);

  it("oculta el acceso de registro cuando hay una sesión activa", async () => {
    sesion.usuario = { idUsuario: 4, nombre: "Usuario" };

    render(<MemoryRouter><PaginaEventos /></MemoryRouter>);

    await screen.findByRole("heading", { name: "No hay eventos publicados todavía" });
    expect(screen.queryByRole("link", { name: "Crear una cuenta" })).toBeNull();
  });

  it("muestra el acceso de registro a visitantes sin sesión", async () => {
    sesion.usuario = null;

    render(<MemoryRouter><PaginaEventos /></MemoryRouter>);

    expect(await screen.findByRole("link", { name: "Crear una cuenta" })).toBeTruthy();
  });
});
