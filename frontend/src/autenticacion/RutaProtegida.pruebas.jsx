import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({ cargando: false, usuario: null }));

vi.mock("./ContextoSesion", () => ({ usarSesion: () => sesion }));

import { RutaProtegida } from "./RutaProtegida";

function mostrarRutaAdministrativa() {
  return render(
    <MemoryRouter initialEntries={["/administracion/eventos"]}>
      <Routes>
        <Route
          path="/administracion/eventos"
          element={<RutaProtegida permiso="EVENTOLEER"><h1>Administración de eventos</h1></RutaProtegida>}
        />
        <Route path="/403" element={<h1>Acceso no autorizado</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Ruta protegida", () => {
  afterEach(cleanup);

  beforeEach(() => {
    sesion.cargando = false;
    sesion.usuario = null;
  });

  it("rechaza rutas administrativas para una cuenta común aunque tenga permisos antiguos", async () => {
    sesion.usuario = {
      roles: ["USUARIOREGISTRADO"],
      permisos: ["EVENTOLEER"],
    };

    mostrarRutaAdministrativa();

    expect(await screen.findByRole("heading", { name: "Acceso no autorizado" })).toBeTruthy();
  });

  it("conserva el acceso del operador que tiene el permiso requerido", () => {
    sesion.usuario = {
      roles: ["USUARIOREGISTRADO", "OPERADOREVENTOS"],
      permisos: ["EVENTOLEER"],
    };

    mostrarRutaAdministrativa();

    expect(screen.getByRole("heading", { name: "Administración de eventos" })).toBeTruthy();
  });
});
