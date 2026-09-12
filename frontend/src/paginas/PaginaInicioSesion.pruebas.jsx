import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({ iniciar: vi.fn() }));

vi.mock("../autenticacion/ContextoSesion", () => ({ usarSesion: () => sesion }));
vi.mock("../componentes/EstructuraPortal", () => ({ MarcaPortal: () => <span>Parque Erick Barrondo</span> }));

import { PaginaInicioSesion } from "./PaginaInicioSesion";

describe("Inicio de sesión", () => {
  beforeEach(() => {
    sesion.iniciar.mockReset().mockResolvedValue({
      roles: ["ADMINISTRADOR"],
      permisos: ["ROLGESTIONAR"],
    });
  });

  it("lleva al inicio después de autenticarse", async () => {
    render(
      <MemoryRouter initialEntries={["/iniciar-sesion"]}>
        <Routes>
          <Route path="/iniciar-sesion" element={<PaginaInicioSesion />} />
          <Route path="/" element={<h1>Inicio del portal</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "administrador@parque.local" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "ContrasenaSegura123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("heading", { name: "Inicio del portal" })).toBeTruthy();
    expect(sesion.iniciar).toHaveBeenCalledWith({
      correo: "administrador@parque.local",
      contrasena: "ContrasenaSegura123!",
      mantenerSesionActiva: false,
    });
  });

  it("muestra un error de acceso breve y claro", async () => {
    sesion.iniciar.mockRejectedValueOnce(new Error("La contraseña es incorrecta. Vuelve a intentarlo."));
    render(
      <MemoryRouter initialEntries={["/iniciar-sesion"]}>
        <Routes><Route path="/iniciar-sesion" element={<PaginaInicioSesion />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "persona@ejemplo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "incorrecta" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("La contraseña es incorrecta. Vuelve a intentarlo.");
    expect(alerta.textContent).not.toContain("HTTP");
  });
});
