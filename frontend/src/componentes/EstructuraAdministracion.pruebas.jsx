import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({
  cerrar: vi.fn(),
  usuario: {
    nombre: "Administrador Revisión",
    roles: ["ADMINISTRADOR"],
  },
}));

vi.mock("../autenticacion/ContextoSesion", () => ({
  usarSesion: () => sesion,
}));

import { EstructuraAdministracion } from "./EstructuraAdministracion";

describe("Estructura administrativa", () => {
  afterEach(cleanup);
  beforeEach(() => {
    sesion.cerrar.mockReset().mockResolvedValue(undefined);
  });

  it("muestra la identidad administrativa y permite cerrar la sesión", async () => {
    render(
      <MemoryRouter initialEntries={["/administracion"]}>
        <Routes>
          <Route path="/administracion" element={<EstructuraAdministracion><h1>Módulo de prueba</h1></EstructuraAdministracion>} />
          <Route path="/iniciar-sesion" element={<h1>Iniciar sesión</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Atrás" }).getAttribute("href")).toBe("/perfil#modulos");
    expect(screen.getByText("Administrador")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(sesion.cerrar).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  });

  it("regresa desde un módulo a la pantalla de módulos", async () => {
    render(
      <MemoryRouter initialEntries={["/administracion/solicitudes"]}>
        <Routes>
          <Route path="/administracion/solicitudes" element={<EstructuraAdministracion><h1>Solicitudes</h1></EstructuraAdministracion>} />
          <Route path="/perfil" element={<section id="modulos"><h1>Visualización de módulos</h1></section>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Atrás" }));
    expect(await screen.findByRole("heading", { name: "Visualización de módulos" })).toBeTruthy();
    expect(sesion.cerrar).not.toHaveBeenCalled();
  });
});
