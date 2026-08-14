import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

    expect(screen.getByRole("link", { name: "Parque Erick Barrondo" })).toBeTruthy();
    expect(screen.getByText("Administrador")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(sesion.cerrar).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  });
});
